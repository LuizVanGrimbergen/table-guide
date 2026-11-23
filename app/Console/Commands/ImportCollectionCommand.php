<?php

namespace App\Console\Commands;

use App\Actions\ImportCollection;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

#[Signature('collection:import
    {file : Path to a restaurants JSON file, e.g. data/restaurants.json}
    {email : Email of the user who owns this collection}
    {--create-user : Create the user if they do not exist yet}
    {--name= : Name for a newly created user}')]
#[Description('Import a restaurant list into one user\'s collection')]
class ImportCollectionCommand extends Command
{
    public function handle(ImportCollection $import): int
    {
        $path = $this->argument('file');
        $path = is_file($path) ? $path : base_path($path);

        if (! is_file($path)) {
            $this->error("File not found: {$this->argument('file')}");

            return self::FAILURE;
        }

        $rows = json_decode((string) file_get_contents($path), true);

        if (! is_array($rows) || ! array_is_list($rows)) {
            $this->error('The file must contain a JSON list of restaurants.');

            return self::FAILURE;
        }

        $email = Str::lower($this->argument('email'));
        $user = User::where('email', $email)->first();

        if (! $user && $this->option('create-user')) {
            $user = User::create([
                'name' => $this->option('name') ?: Str::before($email, '@'),
                'email' => $email,
                'password' => Str::password(32),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
            $this->warn("Created {$email} with a random password. Use \"Forgot password\" to set one.");
        }

        if (! $user) {
            $this->error("No user with email {$email}. Register first, or pass --create-user.");

            return self::FAILURE;
        }

        $stats = $import->handle($user, $rows);

        $this->info('Imported '.count($rows)." rows for {$user->email}.");
        $this->table(['', 'Count'], [
            ['Restaurants created', $stats['restaurants_created']],
            ['Restaurants already known', $stats['restaurants_reused']],
            ['Saved entries created', $stats['entries_created']],
            ['Saved entries kept as they were', $stats['entries_skipped']],
        ]);

        return self::SUCCESS;
    }
}
