<?php

namespace App\Contracts;

interface AIProviderInterface
{
    /**
     * Send a prompt and get a response.
     */
    public function generateResponse(string $prompt, array $context = []): string;
}
