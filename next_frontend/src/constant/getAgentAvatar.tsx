export const getAgentAvatar = (cat = "") =>
  /sales/i.test(cat) ? "💼" : /hr/i.test(cat) ? "👥" : "🤖";
