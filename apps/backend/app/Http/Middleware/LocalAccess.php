<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LocalAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $address = $request->server('REMOTE_ADDR', '127.0.0.1');
        abort_unless(in_array($address, ['127.0.0.1', '::1'], true), 403, 'NOVA accepts loopback connections only.');
        abort_unless(in_array($request->getHost(), ['localhost', '127.0.0.1', '::1', '[::1]'], true), 403, 'Untrusted host.');
        $origin = $request->header('Origin');
        $mediaOrigin = false;
        if ($origin && $request->is('storage/assets/*')) {
            $parts = parse_url($origin);
            $mediaOrigin = $parts && ($parts['scheme'] ?? '') === 'http' && in_array($parts['host'] ?? '', ['127.0.0.1', 'localhost'], true) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['path']) && ! isset($parts['query']) && ! isset($parts['fragment']);
        }
        abort_if($origin && ! $mediaOrigin && ! in_array($origin, config('nova.origins'), true), 403, 'Untrusted origin.');
        abort_if($request->header('Sec-Fetch-Site') === 'cross-site' && ! $mediaOrigin, 403, 'Cross-site requests are blocked.');
        if ($request->is('api/*') && config('nova.api_token')) {
            abort_unless(hash_equals(config('nova.api_token'), (string) $request->bearerToken()), 401, 'A valid local API token is required.');
        }
        abort_if((int) $request->header('Content-Length', 0) > config('nova.upload_limit') + 1048576, 413, 'Request is too large.');
        $response = $mediaOrigin && $request->isMethod('OPTIONS') ? response()->noContent() : $next($request);
        if ($mediaOrigin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Range');
            $response->headers->set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
            $response->headers->set('Vary', 'Origin');
        }
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        return $response;
    }
}
