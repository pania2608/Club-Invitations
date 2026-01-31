// recruit-ladies-playwright.js
module.exports = async function runStatsExtractor(page) {
  // -------------------------------
  // Phase 1: Profile ID Extraction
  // -------------------------------
  console.log("🚀 Starting Phase 1: Profile ID Extraction (No Club)");

  const startPage = 1; //change
  const endPage = 90; //change
  const tierId = 8; //change
  let allProfiles = [];

  await page.goto('https://v3.g.ladypopular.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  console.log(`🔍 Scanning pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}...`);

    try {
      const profilesOnPage = await page.evaluate(async ({ currentPage, tierId }) => {
        const res = await fetch('/ajax/ranking/players.php', {
          method: 'POST',
          body: new URLSearchParams({ action: 'getRanking', page: currentPage.toString(), tierId: tierId.toString() }),
          credentials: 'same-origin'
        });
        const data = await res.json();
        if (!data.html) return [];

        const container = document.createElement('div');
        container.innerHTML = data.html;
        const rows = container.querySelectorAll('tr');
        const results = [];

        rows.forEach(row => {
          const profileLink = row.querySelector('.player-avatar a');
          const guildCell = row.querySelector('.ranking-player-guild');
          if (!profileLink || !guildCell) return;
          if (guildCell.querySelector('a')) return; // if guild has <a>, player IS in a club

          const href = profileLink.getAttribute('href');
          const idMatch = href.match(/lady_id=(\d+)/);
          if (!idMatch) return;
          const nameEl = row.querySelector('.player-avatar-name');
          const name = nameEl ? nameEl.textContent.trim() : 'Unknown';
          results.push({ ladyId: idMatch[1], name });
        });

        return results;
      }, { currentPage, tierId });

      console.log(`   🎯 Found ${profilesOnPage.length} profiles without club`);
      allProfiles.push(...profilesOnPage);
    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 1 Complete");
  console.log(`👭 Total profiles without club: ${allProfiles.length}`);
  console.log("📋 Sample output:", allProfiles.slice(0, 5));
  const allLadies = allProfiles;

  // -------------------------------
  // Phase 2: Sending Invites
  // -------------------------------
  if (allLadies.length === 0) {
    console.log("❌ No ladies to invite. Phase 3 skipped.");
    return;
  }

  console.log(`🚀 Starting Phase 3: Sending invites to ${allLadies.length} ladies`);

  const inviteMessage = `Hi Lovely! We currently have an active club fight going on and we really need your support. Club Fight Time: 31 January 2026 at 23:00 Please join us today and participate in the fight. You’re free to leave once the club fight is over if you want. Thank you so much for your support!`;

  for (let i = 0; i < allLadies.length; i++) {
    const lady = allLadies[i];
    console.log(`📤 Sending invite ${i + 1}/${allLadies.length}`);
    console.log(`   👩 Name: ${lady.name}`);
    console.log(`   🆔 Lady ID: ${lady.ladyId}`);
    console.log(`   🌐 Current page: ${await page.url()}`);

    try {
      const res = await page.evaluate(async ({ ladyId, message }) => {
        const response = await fetch('/ajax/guilds.php', {
          method: 'POST',
          body: new URLSearchParams({ type: 'invite', lady: ladyId, message }),
          credentials: 'same-origin'
        });
        return await response.json();
      }, { ladyId: lady.ladyId, message: inviteMessage });

      console.log(`   📝 Response: ${JSON.stringify(res)}`);
      if (res.status === 1) {
        console.log(`✅ Invite sent to ${lady.name} (${lady.ladyId})`);
      } else {
        console.log(`⚠️ Failed to send invite to ${lady.name} (${lady.ladyId}): ${res.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.log(`❌ Error sending invite to ${lady.name} (${lady.ladyId}): ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 3 Complete. All invites processed.");
};
