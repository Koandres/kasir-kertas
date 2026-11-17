<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--keep= : Jumlah berkas terjadwal yang disimpan}';

    protected $description = 'Buat backup SQLite konsisten dan pangkas backup lama';

    public function handle(DatabaseBackupService $backups): int
    {
        try {
            $path = $backups->create('terjadwal');
            $keep = (int) ($this->option('keep') ?: $backups->keep());
            $deleted = $backups->prune($keep);
        } catch (Throwable $exception) {
            $this->error('Backup gagal: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->info('Backup dibuat: '.$path);

        if ($deleted > 0) {
            $this->line("{$deleted} backup lama dihapus (retensi {$keep} berkas).");
        }

        return self::SUCCESS;
    }
}
