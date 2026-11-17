<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('db:backup')
    ->dailyAt((string) config('pos.backup.hour', '23:30'))
    ->timezone((string) config('app.timezone', 'Asia/Jakarta'))
    ->withoutOverlapping();
