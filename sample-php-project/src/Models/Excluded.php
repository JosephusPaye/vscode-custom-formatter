<?php
namespace Models;
class Excluded
{
    /*
    how
    */
    private string $name;
    private string $email;

    public function __construct
    (string $name, string $email)
    {
        $this->name = $name . "hi";
        $this->email = $email;
    }

    public function getName(

    ): string {
        return $this->name;
    }

    public function getEmail(): string
    {
        return $this ->email;
    }
}
