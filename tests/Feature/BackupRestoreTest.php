<?php

use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

function backupDirectory(): string
{
    return storage_path('app/testing-backups');
}

function backupAdmin(): User
{
    return User::create([
        'name' => 'Admin Backup',
        'email' => 'backup-'.uniqid().'@kasirkertas.test',
        'password' => 'password',
        'role' => 'admin',
        'is_active' => true,
    ]);
}

beforeEach(function () {
    File::deleteDirectory(backupDirectory());
    File::ensureDirectoryExists(backupDirectory());

    $database = backupDirectory().'/live.sqlite';
    File::put($database, '');

    config([
        'database.connections.backup_test' => [
            'driver' => 'sqlite',
            'database' => $database,
            'prefix' => '',
            'foreign_key_constraints' => true,
        ],
        'pos.backup.connection' => 'backup_test',
        'pos.backup.directory' => backupDirectory(),
        'pos.backup.database' => $database,
        'pos.backup.keep' => 2,
    ]);

    Artisan::call('migrate', ['--database' => 'backup_test', '--force' => true]);
});

afterEach(function () {
    File::deleteDirectory(backupDirectory());
});

test('vacuum into menghasilkan backup sqlite yang valid', function () {
    $path = app(DatabaseBackupService::class)->create('uji');

    expect(is_file($path))->toBeTrue();

    $pdo = new PDO('sqlite:'.$path);
    $integrity = $pdo->query('PRAGMA integrity_check')->fetchColumn();
    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type = 'table'")->fetchAll(PDO::FETCH_COLUMN);
    $pdo = null;

    expect($integrity)->toBe('ok')
        ->and($tables)->toContain('users')
        ->and($tables)->toContain('sales')
        ->and($tables)->toContain('sale_returns');
});

test('perintah db backup menyimpan berkas dan memangkas sesuai retensi', function () {
    Artisan::call('db:backup', ['--keep' => 2]);
    Artisan::call('db:backup', ['--keep' => 2]);
    Artisan::call('db:backup', ['--keep' => 2]);

    $files = glob(backupDirectory().'/terjadwal-*.sqlite') ?: [];

    expect($files)->toHaveCount(2);
});

test('validasi restore menolak berkas yang bukan database kasir kertas', function () {
    $service = app(DatabaseBackupService::class);
    $valid = $service->create('uji');

    $service->validate($valid);

    $invalid = backupDirectory().'/invalid.sqlite';
    File::put($invalid, 'bukan database');

    $foreign = backupDirectory().'/foreign.sqlite';
    $pdo = new PDO('sqlite:'.$foreign);
    $pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    $pdo = null;

    expect(fn () => $service->validate($invalid))->toThrow(ValidationException::class)
        ->and(fn () => $service->validate($foreign))->toThrow(ValidationException::class);
});

test('unduh backup manual dan restore tidak valid ditolak lewat pengaturan', function () {
    $admin = backupAdmin();

    $this->actingAs($admin)
        ->get('/pengaturan/backup')
        ->assertOk()
        ->assertDownload();

    $this->actingAs($admin)
        ->post('/pengaturan/restore', [
            'file' => UploadedFile::fake()->createWithContent('backup.sqlite', 'bukan database'),
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('file');
});
