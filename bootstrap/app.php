<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Token CSRF kedaluwarsa biasanya berarti sesi sudah habis. Redirect dengan
        // pesan yang jelas, jangan biarkan Inertia menampilkan "CSRF token mismatch".
        // Laravel memetakan TokenMismatchException menjadi HttpException 419 lebih dulu.
        $exceptions->render(function (HttpException $exception, Request $request) {
            if ($exception->getStatusCode() !== 419) {
                return null;
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            if (! $request->user()) {
                return redirect()
                    ->route('login')
                    ->with('status', 'Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk kembali.');
            }

            return redirect()
                ->back(fallback: route('kasir'))
                ->with('error', 'Token keamanan diperbarui. Silakan ulangi transaksi.');
        });
    })->create();
