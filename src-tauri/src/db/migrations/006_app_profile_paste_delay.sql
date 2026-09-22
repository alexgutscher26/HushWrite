-- Optional measured Ctrl+V response delay. NULL means the profile follows
-- the global paste delay setting.
ALTER TABLE app_profiles ADD COLUMN paste_delay_ms INTEGER;
