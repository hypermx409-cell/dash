"""Default module definitions."""

DEFAULT_MODULE_KEYS = [
    "coins", "wallet", "payments", "referrals", "rewards", "discord",
    "support", "announcements", "notifications", "analytics", "maintenance",
    "links", "afk",
]

DEFAULT_MODULE_CONFIGS = {
    "links": '{"reward":10,"wait_seconds":15,"links":[]}',
    "afk": '{"coins_per_interval":5,"interval_seconds":60}',
}
