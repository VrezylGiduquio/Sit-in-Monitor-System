<?php
require __DIR__ . '/php-frontend-and-backend/config/env.php';

sitin_load_env([
    __DIR__ . '/.env',
    __DIR__ . '/php-frontend-and-backend/.env',
]);

$host     = sitin_env('DB_HOST', 'localhost');
$port     = sitin_env('DB_PORT', '3306');
$dbname   = sitin_env('DB_NAME', 'sitin-system');
$username = sitin_env('DB_USER', 'root');
$password = sitin_env('DB_PASS', 'admin');

echo "Testing connection to: mysql://$host:$port/$dbname as $username\n\n";

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ CONNECTION SUCCESSFUL!\n\n";
    
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables in '$dbname':\n";
    foreach ($tables as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        echo "  - $table ($count rows)\n";
    }
    
    echo "\n✅ Database is ready and accessible!\n";
} catch (PDOException $e) {
    echo "❌ CONNECTION FAILED:\n";
    echo "   " . $e->getMessage() . "\n\n";
    
    echo "--- Trying to reach MySQL server (without specifying database) ---\n";
    try {
        $pdo2 = new PDO("mysql:host=$host;port=$port;charset=utf8", $username, $password);
        $pdo2->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "✅ MySQL server IS reachable at $host:$port\n";
        
        $db_list = $pdo2->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
        echo "Existing databases: " . implode(', ', $db_list) . "\n";
        
        if (!in_array($dbname, $db_list)) {
            $pdo2->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            echo "✅ Created database '$dbname'\n";
        }
    } catch (PDOException $e2) {
        echo "❌ Cannot reach MySQL server at $host:$port\n";
        echo "   " . $e2->getMessage() . "\n";
        
        // Try DNS resolution
        echo "\n--- DNS Check ---\n";
        $ip = gethostbyname($host);
        if ($ip === $host) {
            echo "❌ DNS resolution failed for: $host\n";
        } else {
            echo "✅ DNS resolved $host -> $ip\n";
            
            // Try pinging
            $ping = shell_exec("ping -n 1 -w 3 $ip 2>&1");
            echo $ping ? "Ping result:\n$ping" : "Ping command failed\n";
        }
    }
}

// Additional network info
echo "\n--- Network Info ---\n";
echo "Host: " . php_uname('n') . "\n";
echo "PHP: " . phpversion() . "\n";

// Check if DNS can resolve
echo "\n--- DNS Resolution for sql104.infinityfree.com ---\n";
$dns = dns_get_record('sql104.infinityfree.com', DNS_A);
if ($dns) {
    echo "✅ Resolved: " . json_encode($dns) . "\n";
} else {
    echo "❌ DNS lookup failed\n";
}

$dns2 = dns_get_record('sql104.infinityfree.com', DNS_AAAA);
if ($dns2) {
    echo "✅ IPv6 Resolved: " . json_encode($dns2) . "\n";
} else {
    echo "No IPv6 record\n";
}
