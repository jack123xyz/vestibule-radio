#!/usr/bin/liquidsoap

settings.log.stdout.set(true)

music = playlist(mode="randomize", reload=600, "/music")
radio = crossfade(duration=3., fade_in=0., fade_out=0., music)

output.icecast(
  %mp3(bitrate=192),
  radio,
  host="icecast",
  port=8000,
  password="vestibule",
  mount="/stream",
  name="Vestibule Community Radio",
  description="24/7 community radio",
  fallible=true
)
