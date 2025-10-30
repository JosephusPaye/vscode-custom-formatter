<?php

namespace Models;

class User
{
    private string $name;

    private string $email;

    public function __construct(string $name, string $email)
    {
        $this->name = 'The Esteemed '.$name;
        $this->email = $email;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getEmail(): string
    {
        return $this->email;
    }
}
