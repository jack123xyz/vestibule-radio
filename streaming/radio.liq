#!/usr/bin/liquidsoap

log.file.path := "/tmp/radio.log"
log.stdout := true

radio = playlist(reload_mode="watch", "/music")

radio = blank.skip(max_blank=3.0, radio)

radio = normalize(radio)

radio = crossfade(duration=3.0, fade_in=0.0, fade_out=0.0, radio)

# Failsafe with silence when temporarily unavailable
radio = mksafe(radio)

output.icecast(
  %mp3(bitrate = 192),
  host="icecast",
  port=8000,
  password=environment.get("ICECAST_SOURCE_PASSWORD"),
  mount="/stream",
  name=
    "Vestibule Community Radio",
  description=
    "24/7 community radio",
  send_icy_metadata=true,
  radio
)
