import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compile } from "../framework/compile";
import { getContent } from "../framework/registry";
import { getNarration } from "../narration";
import { ProofVideo } from "../framework/ProofVideo";
import { RemotionProvider } from "./runtime";
import type { Timeline } from "../framework/compile";

/**
 * The clickable stepper. It renders the same `ProofVideo` the MP4 came from and
 * reads the same compiled timeline, so "jump to step 4" here means exactly what
 * it meant in the render — nothing is re-drawn for the web.
 *
 * Two cuts of one problem, chosen at the top:
 *
 *   带配音 — the timeline compiled from measured speech. Audio is the clock.
 *   不带配音 — the timeline compiled from line counts, the original silent cut.
 *             Shorter, because nothing is waiting on a voice.
 *
 * That distinction is the reason this is a mode and not a mute button: they are
 * different films, not the same film with and without sound.
 */

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const clock = (frames: number) => {
  const s = Math.max(0, Math.round(frames / FPS));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const App: React.FC<{ readonly contentId: string }> = ({ contentId }) => {
  const ID = contentId;
  const content = useMemo(() => getContent(ID), [ID]);
  const narration = useMemo(() => getNarration(ID), [ID]);
  const voicedTl = useMemo(() => compile(content, narration, FPS), [content, narration]);
  const silentTl = useMemo(() => compile(content, undefined, FPS), [content]);

  const hasVoice = narration !== undefined;
  // Deep links: ?f=<frame> lands on a frame, ?mode=silent opens the silent cut.
  // Handy for sharing "look at step 5", and it is how the headless checks drive
  // the page without a click simulator.
  const url = new URLSearchParams(window.location.search);
  const urlFrame = Number(url.get("f") ?? 0) || 0;
  const urlSilent = url.get("mode") === "silent";
  const [voiced, setVoiced] = useState(hasVoice && !urlSilent);
  const tl: Timeline = voiced ? voicedTl : silentTl;

  const [frame, setFrame] = useState(() =>
    Math.max(0, Math.min((urlSilent ? silentTl : voicedTl).total - 1, Math.round(urlFrame))),
  );
  const [playing, setPlaying] = useState(false);
  const [scale, setScale] = useState(0.35);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // A deep-linked frame must also position the audio, or the first play would
  // start the voice from the beginning while the picture sits mid-film.
  useEffect(() => {
    if (urlFrame > 0 && audioRef.current && voiced) {
      try {
        audioRef.current.currentTime = frameRef.current / FPS;
      } catch {
        /* audio not seekable yet */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scale the composition; never let CSS lay it out. Every element inside is
  // absolutely positioned in 1920x1080 pixels.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / WIDTH || 0.35);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampFrame = useCallback(
    (f: number) => Math.max(0, Math.min(tl.total - 1, Math.round(f))),
    [tl.total],
  );

  const seek = useCallback(
    (f: number) => {
      const at = clampFrame(f);
      frameRef.current = at;
      setFrame(at);
      const el = audioRef.current;
      if (el && voiced) {
        try {
          el.currentTime = at / FPS;
        } catch {
          /* not seekable yet — the frame already moved */
        }
      }
    },
    [clampFrame, voiced],
  );

  // Audio leads, picture follows. Never the reverse: a wall-clock loop that
  // corrects the audio toward itself spends its time dragging speech backwards
  // whenever rendering falls behind, and the same sentence replays.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const el = audioRef.current;
      let next: number;
      if (voiced && el && el.readyState >= 2 && !el.paused) {
        next = Math.floor(el.currentTime * FPS);
      } else {
        next = frameRef.current + ((now - last) / 1000) * FPS;
      }
      last = now;
      const at = clampFrame(next);
      if (at !== frameRef.current) {
        frameRef.current = at;
        setFrame(at);
      }
      if (at >= tl.total - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, voiced, tl.total, clampFrame]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing && voiced) void el.play().catch(() => {});
    else if (!el.paused) el.pause();
  }, [playing, voiced]);

  // Switching cuts resets both clocks: the two timelines have different totals,
  // so a shared frame number would mean something else in each.
  const switchMode = (next: boolean) => {
    setPlaying(false);
    setVoiced(next);
    seek(0);
  };

  const stepIndex = useMemo(() => {
    const i = tl.steps.findIndex((s) => frame >= s.from && frame < s.from + s.dur);
    return i < 0 ? 0 : i;
  }, [tl, frame]);

  const current = tl.steps[stepIndex];

  /** Which spoken line we are inside, if any. */
  const lineIndex = useMemo(() => {
    if (!voiced || !current) return -1;
    const local = frame - current.from;
    let idx = -1;
    current.lineAt.forEach((at, i) => {
      if (local >= at) idx = i;
    });
    return idx;
  }, [voiced, current, frame]);

  const spokenLine = useMemo(() => {
    if (lineIndex < 0 || !current) return "";
    const key = current.step.id.replace(/^_/, "");
    return narration?.steps?.[key]?.lines?.[lineIndex]?.text ?? "";
  }, [lineIndex, current, narration]);

  // Land on the step's first spoken line, not on its first frame: the panel
  // fades in over ~0.6 s, so `from + 1` is an empty box, and `from + 20` has
  // already lost the opening of the sentence.
  //
  // "Next" means the next step, not "the next step boundary ahead of this
  // frame". While playing (or after a scrub) the frame can already be hundreds
  // of frames inside the current step, so anchoring on the frame made 下一步 skip
  // a whole step and appear unable to reach the last one. Stepping is anchored
  // on the step the playhead is standing in.
  const landOn = useCallback(
    (i: number) => {
      const s = tl.steps[i];
      if (!s) return;
      const first = s.lineAt[0] ?? 18;
      seek(Math.min(s.from + first, s.from + s.dur - 3));
    },
    [tl, seek],
  );

  const jumpTo = (i: number) => landOn(i);
  const atEnd = frame >= tl.total - 2;
  const canPrev = stepIndex > 0;
  const canNext = stepIndex < tl.steps.length - 1 || !atEnd;

  // At the very end there is no next step, and seeking to the end is a no-op —
  // so the last step would be unreachable once the film had played out. Rewind
  // instead, which is what a "next" button does when it has nowhere to go.
  const goto = (delta: number) => {
    const target = stepIndex + delta;
    if (target >= tl.steps.length) return seek(tl.total - 1);
    landOn(Math.max(0, target));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goto(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goto(-1); }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Home") { e.preventDefault(); seek(0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = tl.total > 1 ? frame / (tl.total - 1) : 0;

  return (
    <div className="app">
      <div className="head">
        <h1>{content.title}</h1>
        <span className="sub">{content.series}</span>
        <div className="spacer" />
        <div className="modes">
          <button className={voiced ? "on" : ""} disabled={!hasVoice} onClick={() => switchMode(true)}>
            带配音 · {clock(voicedTl.total)}
          </button>
          <button className={voiced ? "" : "on"} onClick={() => switchMode(false)}>
            不带配音 · {clock(silentTl.total)}
          </button>
          <span className="hint">
            {hasVoice ? "两种时间线，同一个题目" : "尚未生成配音，两条时间线相同"}
          </span>
        </div>
      </div>

      <div className="main">
        <div className="stage" ref={boxRef}>
          <div
            className="canvas"
            style={{ transform: `scale(${scale})`, width: WIDTH, height: HEIGHT }}
          >
            <RemotionProvider fps={FPS} durationInFrames={tl.total} frame={frame}>
              <ProofVideo contentId={ID} silent={!voiced} />
            </RemotionProvider>
          </div>
        </div>

        <aside className="side">
          <div className="panelbox">
            <h2>当前这句</h2>
            <div className="now">
              <span className="label">{current?.step.heading || current?.step.id}</span>
              {voiced
                ? hasVoice
                  ? spokenLine || "（等待下一句）"
                  : "没有配音稿：这条时间线就是成片那条，静音播放"
                : "静默版：按无配音时间线播放"}
            </div>
          </div>
          <div className="panelbox">
            <h2>步骤 · {tl.steps.length}</h2>
            <div className="steps">
              {tl.steps.map((s, i) => (
                <button
                  key={s.step.id}
                  className={`step${i === stepIndex ? " on" : ""}${s.card ? " card" : ""}`}
                  onClick={() => jumpTo(i)}
                >
                  <span className="n">{s.card ? (s.step.id === "_statement" ? "题" : "结") : i}</span>
                  <span>{s.step.heading}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="controls">
        <button className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "暂停" : "播放"}
        </button>
        <button onClick={() => goto(-1)} disabled={!canPrev} title="上一步（←）">
          上一步
        </button>
        <button onClick={() => goto(1)} disabled={!canNext} title="下一步（→）">
          下一步
        </button>
        <span className="stepno">
          {stepIndex + 1} / {tl.steps.length}
        </span>
        <span className="time">
          {clock(frame)} / {clock(tl.total)}
        </span>
        <div
          className="bar"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * (tl.total - 1));
          }}
        >
          <div className="track" />
          <div className="fill" style={{ width: `${(progress * 100).toFixed(2)}%` }} />
          <div className="knob" style={{ left: `${(progress * 100).toFixed(2)}%` }} />
        </div>
        <span className="tip">
          <kbd>←</kbd> <kbd>→</kbd> 换步 · <kbd>空格</kbd> 播放/暂停 · <kbd>Home</kbd> 回到开头
        </span>
      </div>

      {voiced ? <audio ref={audioRef} src="./media/voice.m4a" preload="auto" /> : null}
    </div>
  );
};
