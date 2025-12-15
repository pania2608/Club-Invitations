// recruit-ladies-full-updated.js
module.exports = async function runRecruiter(page) {
  // -------------------------------
  // Phase 1: Profile ID Extraction
  // -------------------------------
  console.log("🚀 Starting Phase 1: Profile ID Extraction (No Club)");

  const startPage = 1;
  const endPage = 1;
  const tierId = 1;
  let allProfiles = [];

  // Ensure logged-in session
  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(4000);

  console.log(`🔍 Scanning pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}...`);

    try {
      const profilesOnPage = await page.evaluate(async ({ currentPage, tierId }) => {
        const res = await fetch('/ajax/ranking/players.php', {
          method: 'POST',
          body: new URLSearchParams({
            action: 'getRanking',
            page: currentPage.toString(),
            tierId: tierId.toString()
          }),
          credentials: 'same-origin'
        });

        const data = await res.json();
        if (!data.html) return [];

        const container = document.createElement('div');
        container.innerHTML = data.html;

        const rows = container.querySelectorAll('tr');
        const results = [];

        rows.forEach(row => {
          const profileLink = row.querySelector('a[href*="profile.php?id="]');
          const guildCell = row.querySelector('.ranking-player-guild');

          if (!profileLink || !guildCell) return;
          if (guildCell.querySelector('a')) return; // skip ladies already in a club

          const idMatch = profileLink.getAttribute('href').match(/id=(\d+)/);
          if (!idMatch) return;

          const nameEl = row.querySelector('.player-avatar-name');
          const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

          results.push({
            profileId: idMatch[1],
            name
          });
        });

        return results;
      }, { currentPage, tierId });

      console.log(`   🎯 Found ${profilesOnPage.length} ladies without club`);
      allProfiles.push(...profilesOnPage);

    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 1 Complete");
  console.log(`👭 Total profiles without club: ${allProfiles.length}`);
  console.log("📋 Sample output:");
  console.log(allProfiles.slice(0, 5));

  if (allProfiles.length === 0) {
    console.log("❌ No profiles to process. Exiting.");
    return;
  }

  // -------------------------------
  // Phase 2: Convert Profile IDs → Lady IDs
  // -------------------------------
  console.log(`🚀 Starting Phase 2: Obtaining Lady IDs from Profile IDs`);

  let allLadies = [];

  for (let i = 0; i < allProfiles.length; i++) {
    const profile = allProfiles[i];
    console.log(`🔗 Visiting profile ${i + 1}/${allProfiles.length}: ${profile.name} (Profile ID: ${profile.profileId})`);

    try {
      await page.goto(`https://v3.g.ladypopular.com/profile.php?id=${profile.profileId}`, {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForTimeout(2000);

      const ladyId = await page.evaluate(() => {
        const img = document.querySelector('img[name="0"][alt="character"]');
        if (!img) return null;
        const match = img.src.match(/_lady_(\d+)\.png$/);
        return match ? match[1] : null;
      });

      if (!ladyId) {
        console.log(`❌ Could not find Lady ID for ${profile.name} (Profile ID: ${profile.profileId})`);
        continue;
      }

      console.log(`✅ Found Lady ID for ${profile.name}: ${ladyId}`);
      allLadies.push({ name: profile.name, ladyId });

    } catch (err) {
      console.log(`❌ Error fetching Lady ID for ${profile.name}: ${err.message}`);
    }

    await page.waitForTimeout(1000); // small delay
  }

  console.log("✅ Phase 2 Complete");
  console.log(`👭 Total Lady IDs obtained: ${allLadies.length}`);
  console.log("📋 Sample output:");
  console.log(allLadies.slice(0, 5));

  if (allLadies.length === 0) {
    console.log("❌ No Lady IDs obtained. Exiting.");
    return;
  }

  // -------------------------------
  // Phase 3: Sending Invites
  // -------------------------------
  console.log(`🚀 Starting Phase 3: Sending invites to ${allLadies.length} ladies`);

  const inviteMessage = `Hello dear! 🌸 We’d be happy to welcome you to our club. You are active, strong, and would be a wonderful addition to our team. ➊ 💖 Donations are completely voluntary, and we are very flexible about them. ➋ ⚔️ We encourage members to improve their skills at their own pace and to participate in club battles, which we plan to hold on a fixed day every week. ➌ 👑 We currently have a Vice President position open and are looking to recruit committed members (including you, if you’re interested) who are willing to share responsibility in decision-making for club policies and implementation. ➍ 🤝 We truly value every member’s opinion. All members have an equal say in how the club operates, and decisions are made with collective consent, regardless of level or skill. ➎ 👭 Our current goal is to build a strong club made up of strong ladies with a true sense of loyalty and belonging. We would be delighted to have you join us. Happy gaming! 🌟`;

  for (let i = 0; i < allLadies.length; i++) {
    const lady = allLadies[i];
    console.log(`📤 Sending invite ${i + 1}/${allLadies.length}`);
    console.log(`   👩 Name: ${lady.name}`);
    console.log(`   🆔 Lady ID: ${lady.ladyId}`);
    console.log(`   🌐 Current page: ${page.url()}`);

    try {
      const res = await page.evaluate(async ({ ladyId, message }) => {
        const response = await fetch('/ajax/guilds.php', {
          method: 'POST',
          body: new URLSearchParams({
            type: 'invite',
            lady: ladyId,
            message
          }),
          credentials: 'same-origin'
        });
        return await response.json();
      }, { ladyId: lady.ladyId, message: inviteMessage });

      console.log(`   📝 Response:`, res);

      if (res.status === 1) {
        console.log(`✅ Invite sent to ${lady.name} (${lady.ladyId})`);
      } else {
        console.log(`⚠️ Failed to send invite to ${lady.name} (${lady.ladyId}): ${res.message || 'Unknown error'}`);
      }

    } catch (err) {
      console.log(`❌ Error sending invite to ${lady.name} (${lady.ladyId}): ${err.message}`);
    }

    await page.waitForTimeout(2000); // delay between invites
  }

  console.log("✅ Phase 3 Complete. All invites processed.");
};
