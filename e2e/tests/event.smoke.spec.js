import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, openAuthenticatedPage } from '../utils/auth';
import { getSeedData } from '../utils/seed';
function toDatetimeLocalValue(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
test('community event can be created, RSVPed, and used to open a DM with an attendee', async ({ browser, page, }) => {
    const seed = await getSeedData();
    const title = `playwright-event-${Date.now()}`;
    const description = `playwright-event-description-${Date.now()}`;
    const location = `Room ${Date.now()}`;
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    const eventsPath = `/communities/${seed.communitySlug}/events`;
    await bootstrapAuthenticatedPage(page, seed.userA.sessionToken, eventsPath);
    await expect(page.getByTestId('events-page')).toBeVisible();
    await page.getByTestId('events-create-button').click();
    await expect(page.getByTestId('create-event-modal')).toBeVisible();
    await page.getByTestId('create-event-title-input').fill(title);
    await page.getByTestId('create-event-description-input').fill(description);
    await page.getByTestId('create-event-location-input').fill(location);
    await page.getByTestId('create-event-start-input').fill(toDatetimeLocalValue(startAt));
    await page.getByTestId('create-event-end-input').fill(toDatetimeLocalValue(endAt));
    await page.getByTestId('create-event-submit-button').click();
    const createdEventCard = page.getByTestId('event-card').filter({ hasText: title }).first();
    await expect(createdEventCard).toBeVisible();
    await expect(createdEventCard).toContainText(description);
    await expect(createdEventCard).toContainText(location);
    const eventId = await createdEventCard.getAttribute('data-event-id');
    expect(eventId).toBeTruthy();
    const { context: attendeeContext, page: attendeePage } = await openAuthenticatedPage(browser, seed.userC.sessionToken, eventsPath);
    try {
        await expect(attendeePage.getByTestId('events-page')).toBeVisible();
        const attendeeEventCard = attendeePage.locator(`[data-testid="event-card"][data-event-id="${eventId}"]`);
        await expect(attendeeEventCard).toBeVisible();
        const goingButton = attendeeEventCard.getByTestId('event-rsvp-going-button');
        await goingButton.click();
        await expect
            .poll(async () => goingButton.getAttribute('data-active'))
            .toBe('true');
        await expect
            .poll(async () => goingButton.getAttribute('data-count'))
            .toBe('1');
    }
    finally {
        await attendeeContext.close();
    }
    await createdEventCard.getByTestId('event-attendees-button').click();
    const attendeesModal = page.locator(`[data-testid="event-attendees-modal"][data-event-id="${eventId}"]`);
    await expect(attendeesModal).toBeVisible();
    const attendeeRow = attendeesModal.locator(`[data-testid="event-attendee-row"][data-user-id="${seed.userC.id}"][data-status="going"]`);
    await expect(attendeeRow).toBeVisible();
    await attendeeRow.getByTestId('event-attendee-message-button').click();
    await expect(page).toHaveURL(/\/dm\/.+$/);
});
