#!/usr/bin/env bash
# Synthesizes license-free sound effects and a beat-synced music bed with ffmpeg.
# Nothing is downloaded, so there is nothing to license or attribute.
#
# Usage: bash scripts/make-audio.sh [--bpm 120] [--duration 30] [--drop-beat 8]
#                                   [--out public/audio] [--no-music]
#   --drop-beat  beat number where kick + bass come in (the logo reveal).
#   --no-music   only make SFX (keep a music.mp3 you supplied yourself).
set -euo pipefail

BPM=120; DUR=30; DROP_BEAT=0; OUT=public/audio; MUSIC=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bpm) BPM=$2; shift 2 ;;
    --duration) DUR=$2; shift 2 ;;
    --drop-beat) DROP_BEAT=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --no-music) MUSIC=0; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
mkdir -p "$OUT/sfx"
B=$(awk "BEGIN{print 60/$BPM}")        # seconds per beat
D=$(awk "BEGIN{print $DROP_BEAT*$B}")  # drop time in seconds
SR=48000
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# --- SFX ---------------------------------------------------------------------

# Whoosh: pink noise, swelling envelope peaking at 2/3, flanged, panned L→R.
whoosh() {
  local name=$1 d=$2 lp=$3
  local env="pow(t/$d,2)*(1-t/$d)*6.75"
  # Stereo + envelope/pan in one aeval first: ffmpeg 8.0 segfaults when a
  # stereo aeval follows flanger in the same chain.
  ff -f lavfi -i "anoisesrc=color=pink:duration=$d:sample_rate=$SR:amplitude=0.9" \
    -af "aformat=channel_layouts=stereo,aeval='val(0)*$env*(1-0.7*t/$d)|val(1)*$env*(0.3+0.7*t/$d)':c=stereo,highpass=f=180,lowpass=f=$lp,flanger=delay=3:depth=5:speed=0.8,volume=1.8" \
    "$OUT/sfx/$name.wav"
}
whoosh whoosh-1 0.55 5000
whoosh whoosh-2 0.75 3500
whoosh whoosh-3 0.95 6500

# Impact: pitch-dropping sub boom + noise crack + short room echo.
ff -f lavfi -i "aevalsrc='0.95*exp(-t*4.5)*sin(2*PI*(42*t+(140/22)*(1-exp(-22*t))))':s=$SR:d=2" \
   -f lavfi -i "anoisesrc=color=white:duration=0.3:sample_rate=$SR:amplitude=0.8" \
   -filter_complex "[1]aeval='val(0)*exp(-t*28)':c=same,lowpass=f=3000[n];[0][n]amix=inputs=2:normalize=0,aecho=0.8:0.5:60|130:0.25|0.15,aformat=channel_layouts=stereo,alimiter=limit=0.95" \
   "$OUT/sfx/impact.wav"

# Riser: 4 beats long, exponential sine sweep + swelling noise, ends hard on the drop.
R=$(awk "BEGIN{print 4*$B}")
ff -f lavfi -i "aevalsrc='0.45*pow(t/$R,2)*sin(2*PI*180*$R/log(9)*(pow(9,t/$R)-1))':s=$SR:d=$R" \
   -f lavfi -i "anoisesrc=color=pink:duration=$R:sample_rate=$SR:amplitude=0.9" \
   -filter_complex "[1]aeval='val(0)*pow(t/$R,3)*0.7':c=same,highpass=f=900[n];[0][n]amix=inputs=2:normalize=0,aecho=0.7:0.6:90:0.3,aformat=channel_layouts=stereo,alimiter=limit=0.9" \
   "$OUT/sfx/riser.wav"

# Pop (UI cards) and tick (text lines).
ff -f lavfi -i "aevalsrc='0.8*exp(-t*26)*sin(2*PI*(320*t+(520/45)*(1-exp(-45*t))))':s=$SR:d=0.3" \
   -af "aformat=channel_layouts=stereo" "$OUT/sfx/pop.wav"
ff -f lavfi -i "aevalsrc='0.55*exp(-t*90)*sin(2*PI*1900*t)+0.3*exp(-t*60)*sin(2*PI*950*t)':s=$SR:d=0.12" \
   -af "aformat=channel_layouts=stereo" "$OUT/sfx/tick.wav"

echo "SFX → $OUT/sfx (whoosh-1..3, impact, riser, pop, tick)"
[[ $MUSIC == 1 ]] || exit 0

# --- Music bed ---------------------------------------------------------------
# Am – F – C – G, two bars each. Before the drop: pad + soft hats.
# From the drop: four-on-the-floor kick, pumping sub bass, claps, shaker.
M="mod(t,$B)"
K="mod(floor(t/(8*$B)),4)"
ROOT="if(eq($K,0),55,if(eq($K,1),43.65,if(eq($K,2),65.41,49)))"
F1="if(eq($K,0),220,if(eq($K,1),174.61,if(eq($K,2),261.63,196)))"
F2="if(eq($K,0),261.63,if(eq($K,1),220,if(eq($K,2),329.63,246.94)))"
F3="if(eq($K,0),329.63,if(eq($K,1),261.63,if(eq($K,2),392,293.66)))"
ON="gte(t,$D)"
PUMP="(1-$ON*0.6*exp(-$M*7))"
EDGE="min(1,mod(t,8*$B)/0.04)*min(1,(8*$B-mod(t,8*$B))/0.04)"

KICK="$ON*0.9*exp(-$M*9)*sin(2*PI*(48*$M+(120/28)*(1-exp(-28*$M))))"
BASS="$ON*$EDGE*0.38*(1-exp(-$M*10))*(sin(2*PI*$ROOT*t)+0.3*sin(4*PI*$ROOT*t))"
PAD="$EDGE*$PUMP*0.055*(sin(2*PI*$F1*t)+sin(2*PI*$F1*1.004*t)+sin(2*PI*$F2*t)+sin(2*PI*$F2*0.996*t)+sin(2*PI*$F3*t)+0.5*sin(2*PI*$F1*2*t))"

ff -f lavfi -i "aevalsrc='$KICK+$BASS':s=$SR:d=$DUR" \
   -f lavfi -i "aevalsrc='$PAD':s=$SR:d=$DUR" \
   -f lavfi -i "anoisesrc=color=white:duration=$DUR:sample_rate=$SR:amplitude=1" \
   -f lavfi -i "anoisesrc=color=white:duration=$DUR:sample_rate=$SR:amplitude=1" \
   -filter_complex "\
[1]lowpass=f=2200,aformat=channel_layouts=stereo,aecho=0.8:0.7:45|90:0.35|0.25[pad];\
[2]aeval='val(0)*(exp(-mod(t+$B/2,$B)*45)*(0.16+0.08*$ON)+$ON*0.05*exp(-mod(t,$B/4)*80))':c=same,highpass=f=7000[hat];\
[3]aeval='val(0)*$ON*0.4*exp(-mod(t+$B,2*$B)*22)':c=same,bandpass=f=1600:width_type=h:w=1800,aecho=0.6:0.5:35:0.3[clap];\
[0][pad][hat][clap]amix=inputs=4:normalize=0,aformat=channel_layouts=stereo,\
afade=t=in:d=0.3,afade=t=out:st=$(awk "BEGIN{print $DUR-2}"):d=2,\
loudnorm=I=-14:TP=-1.5:LRA=11,aresample=$SR" \
   -c:a libmp3lame -q:a 2 "$OUT/music.mp3"

echo "Music → $OUT/music.mp3 (${BPM} BPM, ${DUR}s, drop at beat $DROP_BEAT = ${D}s)"
