<?php

namespace App\Http\Controllers;

use App\Http\Requests\RestoreBackupRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateAppearanceRequest;
use App\Http\Requests\UpdateStoreSettingsRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function index(): Response
    {
        $database = database_path('database.sqlite');

        return Inertia::render('Settings/Index', [
            'store' => Settings::store(),
            'appearance' => Settings::appearance(),
            'currency' => Settings::currency(),
            'receiptWidth' => Settings::receiptWidth(),
            'accents' => config('pos.accents'),
            'fonts' => config('pos.fonts'),
            'receiptWidths' => config('pos.receipt_widths'),
            'users' => User::query()
                ->withCount('sales')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_active' => $user->is_active,
                    'sales_count' => $user->sales_count,
                ]),
            'backup' => [
                'file' => basename($database),
                'exists' => file_exists($database),
                'size' => file_exists($database) ? $this->humanSize(filesize($database)) : '0 KB',
                'modified' => file_exists($database) ? date('d/m/Y H:i', filemtime($database)) : '-',
            ],
        ]);
    }

    public function updateStore(UpdateStoreSettingsRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $logo = Settings::get('store_logo');

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $name = 'logo-'.now()->format('YmdHis').'.'.$file->getClientOriginalExtension();
            File::ensureDirectoryExists(public_path('uploads'));
            $file->move(public_path('uploads'), $name);

            if ($logo && str_starts_with($logo, '/uploads/')) {
                @unlink(public_path(ltrim($logo, '/')));
            }

            $logo = '/uploads/'.$name;
        }

        Settings::putMany([
            'store_name' => $data['name'],
            'store_address' => $data['address'] ?? '',
            'store_phone' => $data['phone'] ?? '',
            'store_footer' => $data['footer'] ?? '',
            'store_logo' => $logo,
            'receipt_width' => $data['receipt_width'],
        ]);

        return back()->with('success', 'Profil toko disimpan.');
    }

    public function updateAppearance(UpdateAppearanceRequest $request): RedirectResponse
    {
        $data = $request->validated();

        Settings::putMany([
            'theme' => $data['theme'],
            'accent' => $data['accent'],
            'font' => $data['font'],
            'currency_prefix' => $data['currency_prefix'],
            'currency_suffix' => $data['currency_suffix'] ?? '',
            'currency_decimals' => $data['currency_decimals'],
            'currency_thousand_separator' => $data['currency_thousand_separator'],
            'currency_decimal_separator' => $data['currency_decimal_separator'],
        ]);

        return back()->with('success', 'Tampilan dan format mata uang disimpan.');
    }

    public function storeUser(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => $data['password'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Pengguna ditambahkan.');
    }

    public function updateUser(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();
        $active = $request->boolean('is_active');
        $actor = $request->user();

        if ($user->id === $actor->id && (! $active || $data['role'] !== 'admin')) {
            return back()->with('error', 'Anda tidak dapat menonaktifkan atau menurunkan peran akun yang sedang dipakai.');
        }

        if ($user->isAdmin() && (! $active || $data['role'] !== 'admin')) {
            $activeAdmins = User::where('role', 'admin')->where('is_active', true)->whereKeyNot($user->id)->count();

            if ($activeAdmins === 0) {
                return back()->with('error', 'Harus ada minimal satu admin aktif.');
            }
        }

        $update = [
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'is_active' => $active,
        ];

        if (! empty($data['password'])) {
            $update['password'] = $data['password'];
        }

        $user->update($update);

        return back()->with('success', 'Pengguna diperbarui.');
    }

    public function backup()
    {
        $database = database_path('database.sqlite');

        if (! file_exists($database)) {
            return back()->with('error', 'Berkas database tidak ditemukan.');
        }

        try {
            DB::statement('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch (\Throwable) {
            // WAL mungkin tidak aktif; lanjutkan saja.
        }

        return response()->download(
            $database,
            'kasir-kertas-backup-'.now()->format('Ymd-His').'.sqlite',
            ['Content-Type' => 'application/vnd.sqlite3'],
        );
    }

    public function restore(RestoreBackupRequest $request): RedirectResponse
    {
        $source = $request->file('file')->getRealPath();
        $database = database_path('database.sqlite');

        try {
            $pdo = new \PDO('sqlite:'.$source);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $integrity = $pdo->query('PRAGMA integrity_check')->fetchColumn();

            $required = ['users', 'categories', 'products', 'sales', 'sale_items', 'settings', 'sessions'];
            $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(\PDO::FETCH_COLUMN);
            $missing = array_diff($required, $tables);
            $pdo = null;
        } catch (\Throwable) {
            throw ValidationException::withMessages(['file' => 'Berkas bukan database SQLite yang valid.']);
        }

        if (strtolower((string) $integrity) !== 'ok') {
            throw ValidationException::withMessages(['file' => 'Database gagal pemeriksaan integritas.']);
        }

        if ($missing !== []) {
            throw ValidationException::withMessages(['file' => 'Database tidak berasal dari aplikasi Kasir Kertas.']);
        }

        try {
            DB::statement('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch (\Throwable) {
            // abaikan
        }

        $safety = storage_path('app/backup-sebelum-restore-'.now()->format('Ymd-His').'.sqlite');

        DB::disconnect();

        if (file_exists($database)) {
            copy($database, $safety);
        }

        if (! copy($source, $database)) {
            DB::reconnect();

            throw ValidationException::withMessages(['file' => 'Berkas gagal disalin ke database.']);
        }

        @unlink($database.'-wal');
        @unlink($database.'-shm');

        DB::purge();
        DB::reconnect();
        Settings::flush();

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('restored', 'Backup berhasil dipulihkan. Silakan masuk kembali.');
    }

    protected function humanSize(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1, ',', '.').' MB';
        }

        return number_format($bytes / 1024, 1, ',', '.').' KB';
    }
}
