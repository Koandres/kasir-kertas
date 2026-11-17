<?php

namespace App\Services;

use App\Support\Settings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class DatabaseBackupService
{
    public function databasePath(): string
    {
        return (string) config('pos.backup.database');
    }

    public function directory(): string
    {
        return (string) config('pos.backup.directory');
    }

    public function keep(): int
    {
        return max(1, (int) config('pos.backup.keep', 14));
    }

    protected function connection(?string $name = null)
    {
        return DB::connection($name ?: config('pos.backup.connection'));
    }

    /**
     * Buat salinan database yang konsisten memakai VACUUM INTO.
     * Cara ini aman dipakai saat database berjalan dalam mode WAL.
     */
    public function create(string $label = 'terjadwal', ?string $connection = null): string
    {
        $source = $this->databasePath();

        if (! is_file($source)) {
            throw new RuntimeException('Berkas database tidak ditemukan: '.$source);
        }

        $database = $this->connection($connection);

        if ($database->getDriverName() !== 'sqlite') {
            throw new RuntimeException('Backup VACUUM INTO hanya didukung untuk database SQLite.');
        }

        File::ensureDirectoryExists($this->directory());

        $target = $this->uniquePath($label);
        $quoted = str_replace("'", "''", $target);

        $database->statement("VACUUM INTO '{$quoted}'");

        return $target;
    }

    /**
     * Hapus backup terjadwal lama, sisakan sejumlah berkas terbaru.
     */
    public function prune(?int $keep = null): int
    {
        $keep ??= $this->keep();
        $files = glob($this->directory().DIRECTORY_SEPARATOR.'terjadwal-*.sqlite') ?: [];

        rsort($files);

        $deleted = 0;

        foreach (array_slice($files, max(0, $keep)) as $file) {
            if (@unlink($file)) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /** @return array<int, string> */
    public function scheduled(): array
    {
        $files = glob($this->directory().DIRECTORY_SEPARATOR.'terjadwal-*.sqlite') ?: [];

        rsort($files);

        return $files;
    }

    public function latestScheduled(): ?string
    {
        return $this->scheduled()[0] ?? null;
    }

    /**
     * Pastikan berkas benar-benar database SQLite dari aplikasi ini.
     */
    public function validate(string $source): void
    {
        if (! is_file($source)) {
            throw ValidationException::withMessages([
                'file' => 'Berkas backup tidak ditemukan.',
            ]);
        }

        try {
            $pdo = new \PDO('sqlite:'.$source);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $integrity = $pdo->query('PRAGMA integrity_check')->fetchColumn();

            $required = ['users', 'categories', 'products', 'sales', 'sale_items', 'settings', 'sessions'];
            $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(\PDO::FETCH_COLUMN);
            $missing = array_diff($required, $tables);
            $pdo = null;
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'file' => 'Berkas bukan database SQLite yang valid.',
            ]);
        }

        if (strtolower((string) $integrity) !== 'ok') {
            throw ValidationException::withMessages([
                'file' => 'Database gagal pemeriksaan integritas.',
            ]);
        }

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'file' => 'Database tidak berasal dari aplikasi Kasir Kertas.',
            ]);
        }
    }

    /**
     * Ganti database aktif dengan berkas backup. Salinan pengaman dibuat
     * lebih dulu memakai VACUUM INTO.
     */
    public function restore(string $source): string
    {
        $this->validate($source);

        $safety = $this->create('sebelum-restore');
        $database = $this->databasePath();
        $connection = $this->connection();

        $connection->disconnect();

        if (! @copy($source, $database)) {
            $connection->reconnect();

            throw ValidationException::withMessages([
                'file' => 'Berkas gagal disalin ke database.',
            ]);
        }

        @unlink($database.'-wal');
        @unlink($database.'-shm');

        $connection->purge();
        $connection->reconnect();
        Settings::flush();

        return $safety;
    }

    protected function uniquePath(string $label): string
    {
        $base = rtrim($this->directory(), '\\/').DIRECTORY_SEPARATOR.$label.'-'.now()->format('Ymd-His');

        $path = $base.'.sqlite';
        $suffix = 2;

        while (file_exists($path)) {
            $path = $base.'-'.$suffix.'.sqlite';
            $suffix++;
        }

        return $path;
    }
}
