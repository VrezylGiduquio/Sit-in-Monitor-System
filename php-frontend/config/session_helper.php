<?php

const SITIN_STUDENT_SESSION = 'SITIN_STUDENT_SESSID';
const SITIN_ADMIN_SESSION = 'SITIN_ADMIN_SESSID';

function sitin_session_name(string $scope): string
{
    return $scope === 'admin' ? SITIN_ADMIN_SESSION : SITIN_STUDENT_SESSION;
}

function sitin_start_session(string $scope): void
{
    $sessionName = sitin_session_name($scope);

    if (session_status() === PHP_SESSION_ACTIVE) {
        if (session_name() === $sessionName) {
            return;
        }

        session_write_close();
    }

    session_name($sessionName);
    session_start();
}

function sitin_read_session(string $scope): array
{
    sitin_start_session($scope);
    $data = $_SESSION ?? [];
    session_write_close();

    return $data;
}

function sitin_destroy_session(string $scope): void
{
    $sessionName = sitin_session_name($scope);

    if (session_status() === PHP_SESSION_ACTIVE && session_name() !== $sessionName) {
        session_write_close();
    }

    session_name($sessionName);
    session_start();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
    }

    session_destroy();
}
