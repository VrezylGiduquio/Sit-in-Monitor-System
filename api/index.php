<?php
/**
 * Vercel PHP Entry Point — Front Controller
 *
 * Routes all incoming requests to the appropriate file inside
 * `php-frontend-and-backend/` and serves static assets from `public/`.
 */
declare(strict_types=1);

// ── Parse the request path ──────────────────────────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path       = (string) parse_url($requestUri, PHP_URL_PATH);
$path       = '/' . ltrim($path, '/');

// Normalise — strip trailing slash (keep root "/")
$normalised = $path !== '/' ? rtrim($path, '/') : '/';

// ── Determine project root & web root ───────────────────────────────────────
$projectRoot = dirname(__DIR__);                       // one level up from api/
$appRoot     = $projectRoot . '/php-frontend-and-backend';

// ── Static-asset serving ────────────────────────────────────────────────────
$staticExts = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
               'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'doc', 'docx',
               'xls', 'xlsx', 'csv', 'mp4', 'webm', 'json', 'xml'];

$ext = strtolower(pathinfo($normalised, PATHINFO_EXTENSION));

if (in_array($ext, $staticExts, true)) {
    $candidates = [
        $projectRoot . '/public' . $normalised,
        $appRoot . $normalised,
        $appRoot . '/assets' . $normalised,
    ];

    foreach ($candidates as $candidate) {
        $real = realpath($candidate);
        if ($real !== false && is_file($real) && str_starts_with($real, $projectRoot)) {
            $mimeMap = [
                'css'  => 'text/css',
                'js'   => 'application/javascript',
                'png'  => 'image/png',
                'jpg'  => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif'  => 'image/gif',
                'svg'  => 'image/svg+xml',
                'ico'  => 'image/x-icon',
                'webp' => 'image/webp',
                'pdf'  => 'application/pdf',
                'woff' => 'font/woff',
                'woff2'=> 'font/woff2',
                'ttf'  => 'font/ttf',
            ];
            header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
            header('Cache-Control: public, max-age=31536000, immutable');
            readfile($real);
            exit;
        }
    }

    // Fall through — let PHP handle it (e.g. a dynamic route ending in .js)
}

// ── Strip .php extension if present (existing app uses .php URLs) ──────
// e.g. /register_process.php → /register_process
$normalised = preg_replace('/\.php$/i', '', $normalised);

// ── Route table ─────────────────────────────────────────────────────────────
$routeMap = [
    '/'                      => '/index.php',
    '/index'                 => '/index.php',
    '/login'                 => '/login.php',
    '/login_process'         => '/login_process.php',
    '/register'              => '/registration.php',
    '/register_process'      => '/register_process.php',
    '/dashboard'             => '/dashboard.php',
    '/student/dashboard'     => '/student/dashboard.php',
    '/admin'                 => '/admin/admin.php',
    '/admin/dashboard'       => '/admin/admin.php',
];

// ── Try an exact route match first ──────────────────────────────────────────
if (isset($routeMap[$normalised])) {
    $target = $appRoot . $routeMap[$normalised];
    if (file_exists($target)) {
        chdir($appRoot);
        require $target;
        exit;
    }
}

// ── Dynamic route resolution ────────────────────────────────────────────────
$segments = array_values(array_filter(explode('/', $normalised), fn($s) => $s !== ''));
$found    = false;

if (count($segments) >= 2) {
    $subDir  = $segments[0];
    $subFile = $segments[1];

    $subPaths = [
        $appRoot . "/$subDir/$subFile.php",
        $appRoot . "/$subDir/$subFile/index.php",
    ];

    foreach ($subPaths as $sp) {
        if (file_exists($sp)) {
            chdir($appRoot);
            require $sp;
            $found = true;
            break;
        }
    }
}

// ── Fallback: try as a top-level file ───────────────────────────────────────
if (!$found && count($segments) === 1) {
    $file = $segments[0];
    $topPaths = [
        $appRoot . "/$file.php",
        $appRoot . "/$file/$file.php",
    ];
    foreach ($topPaths as $tp) {
        if (file_exists($tp)) {
            chdir($appRoot);
            require $tp;
            $found = true;
            break;
        }
    }
}

// ── 404 ─────────────────────────────────────────────────────────────────────
if (!$found) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><title>404 — Page Not Found</title>';
    echo '<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#eef8f7;color:#18181b;text-align:center;}
    h1{font-size:3rem;color:#0f766e;}p{color:#6b7280;}</style></head>';
    echo '<body><div><h1>404</h1><p>The page you requested could not be found.</p>';
    echo '<a href="/" style="color:#0f766e;font-weight:700;">← Back to Home</a></div></body></html>';
    exit;
}
