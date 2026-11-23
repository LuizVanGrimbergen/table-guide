/**
 * Calendar links for a planned dinner. A calendar event is never a
 * reservation: a proposed dinner is TENTATIVE and says no table is booked.
 */

export type DinnerPlan = {
    name: string;
    area: string | null;
    city: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    timezone: string;
    confirmed: boolean;
    mapsUrl: string;
    website?: string | null;
    uid: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

function stamps(plan: DinnerPlan): { start: string; end: string } {
    const [y, m, d] = plan.date.split('-').map(Number);
    const [hh, mm] = plan.time.split(':').map(Number);
    // Two hours, using plain calendar arithmetic so midnight rolls over.
    const end = new Date(Date.UTC(y, m - 1, d, hh + 2, mm));
    const fmt = (yy: number, mo: number, dd: number, h: number, mi: number) =>
        `${yy}${pad(mo)}${pad(dd)}T${pad(h)}${pad(mi)}00`;

    return {
        start: fmt(y, m, d, hh, mm),
        end: fmt(
            end.getUTCFullYear(),
            end.getUTCMonth() + 1,
            end.getUTCDate(),
            end.getUTCHours(),
            end.getUTCMinutes(),
        ),
    };
}

export function eventTitle(plan: DinnerPlan): string {
    return plan.confirmed
        ? `Dinner at ${plan.name}`
        : `Proposed dinner: ${plan.name}`;
}

export function eventDetails(plan: DinnerPlan): string {
    return [
        plan.confirmed
            ? 'Reservation confirmed by the restaurant.'
            : 'Proposed dinner. No table booked yet.',
        `Map: ${plan.mapsUrl}`,
        plan.website ? `Website: ${plan.website}` : null,
    ]
        .filter(Boolean)
        .join('\n');
}

export function eventLocation(plan: DinnerPlan): string {
    return [plan.name, plan.area, plan.city].filter(Boolean).join(', ');
}

export function googleCalendarUrl(plan: DinnerPlan): string {
    const { start, end } = stamps(plan);
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: eventTitle(plan),
        dates: `${start}/${end}`,
        ctz: plan.timezone,
        details: eventDetails(plan),
        location: eventLocation(plan),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escapeIcs = (text: string) =>
    text
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

export function icsFile(plan: DinnerPlan, now = new Date()): string {
    const { start, end } = stamps(plan);
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//The Collection//EN',
        'BEGIN:VEVENT',
        `UID:${plan.uid}-${start}@thecollection`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${plan.timezone}:${start}`,
        `DTEND;TZID=${plan.timezone}:${end}`,
        `SUMMARY:${escapeIcs(eventTitle(plan))}`,
        `LOCATION:${escapeIcs(eventLocation(plan))}`,
        `DESCRIPTION:${escapeIcs(eventDetails(plan))}`,
        `STATUS:${plan.confirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

export function downloadIcs(plan: DinnerPlan): void {
    const blob = new Blob([icsFile(plan)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}
