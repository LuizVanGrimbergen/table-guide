@php
    $place = collect([$restaurant->area, $restaurant->city])->filter()->implode(', ');
    $query = urlencode(collect([$restaurant->name, $restaurant->area, $restaurant->city])->filter()->implode(' '));
    $directions = "https://www.google.com/maps/dir/?api=1&destination={$query}";
    $title = "{$restaurant->name}, recommended by {$sender->name}";
    $description = collect([$place, $restaurant->cuisine, $rec->message ? '“'.\Illuminate\Support\Str::limit($rec->message, 120).'”' : null])->filter()->implode(' · ');
    $menuKinds = ['food' => 'Food menu', 'drinks' => 'Drinks menu', 'wine' => 'Wine list'];
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#F6F1E8">
    <meta name="robots" content="noindex">
    <title>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="The Collection">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:image" content="{{ asset('og-image.png') }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    @fonts
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-dvh bg-ivory font-sans text-ink antialiased">
    <main class="mx-auto max-w-lg px-5 pt-8 pb-12">
        <p class="font-serif text-[20px]">The Collection</p>

        <p class="mt-8 text-[13px] font-semibold tracking-wide text-olive uppercase">
            Recommended by {{ $sender->name }}
        </p>
        <h1 class="mt-1 font-serif text-[36px] leading-tight">{{ $restaurant->name }}</h1>
        <p class="mt-1 text-[15px] text-ink-muted">
            {{ collect([$place, $restaurant->cuisine])->filter()->implode(' · ') }}
        </p>

        @if ($rating)
            <p class="mt-3 text-[18px] tracking-wider text-burgundy" aria-label="{{ $rating }} out of 5 stars">
                {{ str_repeat('★', $rating) }}<span class="text-line-strong">{{ str_repeat('★', 5 - $rating) }}</span>
                <span class="ml-1 align-middle text-[13px] tracking-normal text-ink-muted">{{ $sender->name }}’s rating</span>
            </p>
        @endif

        @if ($rec->message)
            <blockquote class="mt-6 rounded-[16px] border border-line bg-paper p-5 font-serif text-[20px] leading-snug text-espresso italic">
                “{{ $rec->message }}”
                <footer class="mt-2 font-sans text-[14px] not-italic text-ink-muted">{{ $sender->name }}</footer>
            </blockquote>
        @endif

        <div class="mt-6 flex flex-col gap-3">
            <a href="{{ $directions }}" target="_blank" rel="noopener"
               class="flex h-[52px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper">
                Directions
            </a>
            @if ($restaurant->website)
                <a href="{{ $restaurant->website }}" target="_blank" rel="noopener"
                   class="flex h-[52px] items-center justify-center rounded-full border border-ink text-[15px] font-semibold">
                    Website and bookings
                </a>
            @endif
            @foreach ($restaurant->menuLinks as $link)
                <a href="{{ $link->url }}" target="_blank" rel="noopener"
                   class="flex h-[52px] items-center justify-center gap-2 rounded-full border border-line-strong bg-paper text-[15px] font-semibold">
                    {{ $menuKinds[$link->kind->value] ?? 'Menu' }}
                    @if ($link->maybe_stale)
                        <span class="text-[12px] font-medium text-burgundy">may be outdated</span>
                    @endif
                </a>
            @endforeach
        </div>

        <div class="mt-8 rounded-[16px] border border-line bg-paper p-5">
            @if ($viewer)
                <form method="POST" action="{{ route('recommendations.public.save', $rec->public_token) }}">
                    @csrf
                    <button type="submit" class="h-12 w-full rounded-full bg-olive text-[15px] font-semibold text-paper">
                        Save to my wishlist
                    </button>
                </form>
            @else
                <p class="font-serif text-[20px]">Keep your own collection</p>
                <p class="mt-1 text-[15px] text-ink-muted">
                    Save this place to your wishlist and keep track of where you've been.
                </p>
                <a href="{{ route('recommendations.public.save', $rec->public_token) }}"
                   class="mt-4 flex h-12 items-center justify-center rounded-full bg-olive text-[15px] font-semibold text-paper">
                    Save to my wishlist
                </a>
            @endif
        </div>

        <p class="mt-6 text-center text-[13px] text-ink-muted">
            Nothing is booked until the restaurant confirms.
        </p>
    </main>
</body>
</html>
