<?php
/**
 * TursoDatabase — PDO-compatible wrapper around the libSQL PHP client.
 *
 * Provides a PDO-like interface so existing application code using
 * $pdo->prepare(), $stmt->execute(), $stmt->fetch(), etc. can work
 * with Turso/libSQL on Vercel with minimal changes.
 *
 * Environment variables used:
 *   TURSO_DATABASE_URL  — libSQL URL from Turso (e.g. libsql://sitin-system-xxx.turso.io)
 *   TURSO_AUTH_TOKEN    — authentication token for the database
 */
declare(strict_types=1);

// ── Main Database class ──────────────────────────────────────────────────────
class TursoDatabase
{
    public const FETCH_ASSOC = 2;  // same value as PDO::FETCH_ASSOC

    private ?object $conn = null;
    private string $url;
    private string $authToken;

    public function __construct(string $url, string $authToken)
    {
        $this->url       = $url;
        $this->authToken = $authToken;
    }

    private function connect(): object
    {
        if ($this->conn === null) {
            if (!class_exists(\Libsql\Database::class)) {
                throw new RuntimeException(
                    'Turso/libSQL SDK is not installed. Run: composer require turso/libsql'
                );
            }
            $this->conn = new \Libsql\Database(
                url: $this->url,
                authToken: $this->authToken,
            );
        }
        return $this->conn;
    }

    public function exec(string $sql): int
    {
        $this->connect()->executeBatch($sql);
        return 0;
    }

    /**
     * Run a SELECT query and return all result rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $result = $this->connect()->query($sql, $params);
        $rows   = [];
        while ($row = $result->fetchArray()) {
            $rows[] = json_decode(json_encode($row), true) ?: [];
        }
        return $rows;
    }

    public function prepare(string $sql): TursoStatement
    {
        return new TursoStatement($this, $sql);
    }

    public function lastInsertId(): int
    {
        $rows = $this->query('SELECT last_insert_rowid() AS id');
        return (int) ($rows[0]['id'] ?? 0);
    }

    public function beginTransaction(): bool
    {
        $this->exec('BEGIN TRANSACTION');
        return true;
    }

    public function commit(): bool
    {
        $this->exec('COMMIT');
        return true;
    }

    public function rollBack(): bool
    {
        $this->exec('ROLLBACK');
        return true;
    }
}

// ── Prepared Statement class ─────────────────────────────────────────────────
class TursoStatement
{
    private TursoDatabase $db;
    private string $sql;
    private array $params = [];
    private array $lastResult = [];
    private int $fetchIndex = 0;

    public function __construct(TursoDatabase $db, string $sql)
    {
        $this->db  = $db;
        $this->sql = $sql;
    }

    /**
     * Execute the statement.
     *
     * @param  array $params Positional (?) or named (:name) parameters.
     * @return bool
     */
    public function execute(array $params = []): bool
    {
        $this->params = $params;
        $this->fetchIndex = 0;
        $this->lastResult = [];

        $sql    = $this->sql;
        $values = $params;

        // Convert named placeholders (:foo) to positional (?)
        if (!empty($params) && $this->isNamed()) {
            $parts  = preg_split('/(:\w+)/', $sql, -1, PREG_SPLIT_DELIM_CAPTURE);
            $values = [];
            $sql    = '';
            foreach ($parts as $part) {
                if (str_starts_with($part, ':') && array_key_exists($part, $params)) {
                    $values[] = $params[$part];
                    $sql .= '?';
                } else {
                    $sql .= $part;
                }
            }
        }

        $trimmed = trim(strtoupper($sql));
        $isQuery = str_starts_with($trimmed, 'SELECT')
                || str_starts_with($trimmed, 'WITH')
                || str_starts_with($trimmed, 'PRAGMA');

        if ($isQuery) {
            $this->lastResult = $this->db->query($sql, $values);
        } else {
            $this->db->exec($sql);
        }

        return true;
    }

    /**
     * Fetch the next row.
     *
     * @param  int $fetchStyle Ignored — always returns associative array.
     * @return array|null
     */
    public function fetch(int $fetchStyle = 2): ?array
    {
        if ($this->fetchIndex >= count($this->lastResult)) {
            return null;
        }
        return $this->lastResult[$this->fetchIndex++];
    }

    /**
     * Fetch all remaining rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function fetchAll(): array
    {
        $remaining = array_slice($this->lastResult, $this->fetchIndex);
        $this->fetchIndex = count($this->lastResult);
        return $remaining;
    }

    /**
     * Fetch a single column from the next row.
     */
    public function fetchColumn(int $columnIndex = 0): mixed
    {
        $row = $this->fetch();
        if ($row === null) {
            return false;
        }
        $values = array_values($row);
        return $values[$columnIndex] ?? false;
    }

    public function rowCount(): int
    {
        return count($this->lastResult);
    }

    public function closeCursor(): void
    {
        // no-op
    }

    private function isNamed(): bool
    {
        return str_contains($this->sql, ':');
    }
}
