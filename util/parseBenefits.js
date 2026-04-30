const parseBenefits = (benefits = []) => {
  const result = {
    contactViews: 0,
    interestExpress: 0,
    canMessage: false,

    basicSearch: false,
    advancedSearch: false,

    canViewVisitors: false,
    canSeeViewers: false,

    priorityListing: false,
    topListing: false,
    profileHighlight: false,

    whatsappAlerts: false,
    support: false,
  };

  benefits.forEach((b) => {
    if (!b) return;

    const text = b.toLowerCase();

    // ✅ Contact Views (handles 50, 150 etc)
    if (text.includes("contact")) {
      const num = text.match(/\d+/);
      if (num) {
        result.contactViews = parseInt(num[0]);
      }
    }

    // ✅ Interests (more flexible)
    if (text.includes("interest")) {
      if (text.includes("unlimited")) {
        result.interestExpress = 999;
      } else {
        const num = text.match(/\d+/);
        if (num) result.interestExpress = parseInt(num[0]);
      }
    }

    // ✅ Messaging (handles "message", "messages")
    if (text.includes("message")) {
      result.canMessage = true;
    }

    // ✅ Search Filters
    if (text.includes("basic") && text.includes("search")) {
      result.basicSearch = true;
    }

    if (text.includes("advanced") && text.includes("search")) {
      result.advancedSearch = true;
    }

    // ✅ Visitors
    if (text.includes("profile visitors")) {
      result.canViewVisitors = true;
    }

    if (text.includes("who viewed")) {
      result.canSeeViewers = true;
    }

    // ✅ Listing / Boost
    if (text.includes("priority")) {
      result.priorityListing = true;
    }

    if (text.includes("top profile") || text.includes("higher visibility")) {
      result.topListing = true;
    }

    if (text.includes("highlight") || text.includes("featured")) {
      result.profileHighlight = true;
    }

    // ✅ Alerts
    if (text.includes("whatsapp")) {
      result.whatsappAlerts = true;
    }

    // ✅ Support
    if (text.includes("support")) {
      result.support = true;
    }
  });

  return result;
};

module.exports = parseBenefits;
