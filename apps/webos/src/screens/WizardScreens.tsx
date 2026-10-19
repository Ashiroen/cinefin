import type { ReactNode } from 'react';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import { IconReplay } from '../components/Icons';

function Chrome({
  step,
  children,
}: {
  step: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <div className="screen">
      <div className="wizard-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Logo size={34} />
          <span className="muted">Receiver setup</span>
        </div>
        <div className="steps">
          <span>Step {step} of 3</span>
          <span className="bar">
            <b />
            {step >= 2 ? <b /> : <i />}
            {step >= 3 ? <b /> : <i />}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function WizardDetect({
  onContinue,
  onSkip,
  convertLabel,
}: {
  onContinue: () => void;
  onSkip: () => void;
  convertLabel?: string | null;
}) {
  return (
    <FocusRoot initial="continue">
      <Chrome step={1}>
        <div className="grid-2">
          <div>
            <h1 className="h1" style={{ margin: '18px 0 12px' }}>
              Your TV is connected to your receiver
            </h1>
            <p className="muted" style={{ marginBottom: 28, maxWidth: 720 }}>
              Here's what we found over HDMI eARC. The test on the next step confirms it.
            </p>
            <div className="server-card" style={{ width: '100%', height: 'auto', minHeight: 92, marginBottom: 12, padding: '14px 28px' }}>
              <span className="glyph-orb">✓</span>
              <span>
                <div className="name">Connected over HDMI eARC</div>
                <div className="sub">ONKYO TX-NR7100 · reported by the TV</div>
              </span>
            </div>
            <div className="server-card" style={{ width: '100%', marginBottom: 12, height: 'auto', padding: '18px 28px' }}>
              <span className="glyph-orb">♪</span>
              <span>
                <div className="name">Dolby · sent to receiver · to be confirmed by the test</div>
                <div className="sub" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span className="badge">Dolby Digital</span>
                  <span className="badge">Dolby Digital Plus</span>
                  <span className="badge">TrueHD Atmos</span>
                </div>
              </span>
            </div>
            <div
              className="server-card info-tint"
              style={{ width: '100%', height: 'auto', padding: '18px 28px' }}
            >
              <span className="glyph-orb">ℹ</span>
              <span>
                <div className="name">
                  DTS, DTS-HD MA, DTS:X · {convertLabel ?? 'Not tested yet'}
                </div>
                <div className="sub">
                  Your TV doesn't support DTS. The server converts it to multichannel PCM (lossless) or Dolby Digital Plus.
                </div>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <Focusable id="continue" className="btn btn-wide" onSelect={onContinue}>
                Continue
              </Focusable>
              <Focusable id="skip" className="btn" onSelect={onSkip}>
                Skip for now
              </Focusable>
            </div>
          </div>
          <div>
            <div className="section-label">Your setup</div>
            <div className="server-card" style={{ width: '100%', marginBottom: 8 }}>
              Cinefin on your TV
            </div>
            <div className="muted" style={{ textAlign: 'center', padding: 8 }}>
              HDMI eARC
            </div>
            <div className="server-card" style={{ width: '100%' }}>
              Receiver
              <div className="sub">ONKYO TX-NR7100</div>
            </div>
          </div>
        </div>
      </Chrome>
    </FocusRoot>
  );
}

export function WizardTest({
  onPick,
  onAgain,
  onBack,
}: {
  onPick: (label: string) => void;
  onAgain: () => void;
  onBack: () => void;
}) {
  const formats = [
    'Dolby Atmos',
    'TrueHD',
    'DTS:X',
    'DTS-HD MA',
    'Dolby Digital',
    'PCM',
    'Nothing',
  ];
  return (
    <FocusRoot initial="fmt-Dolby Atmos">
      <Chrome step={2}>
        <div style={{ padding: '36px var(--safe-x)' }}>
          <h1 className="h1" style={{ marginBottom: 12 }}>
            What does your receiver display now?
          </h1>
          <p className="muted" style={{ marginBottom: 28, maxWidth: 880 }}>
            We're playing a Dolby TrueHD Atmos test clip. Look at the receiver's front display and pick what it shows.
          </p>
          <div className="meter" style={{ marginBottom: 28 }}>
            <div className="meter-bars" aria-hidden>
              <i style={{ height: '38%' }} />
              <i style={{ height: '70%' }} />
              <i style={{ height: '100%' }} />
              <i style={{ height: '62%' }} />
              <i style={{ height: '84%' }} />
              <i style={{ height: '46%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Test clip · TrueHD Atmos 7.1.4</div>
              <div className="progress-line" style={{ margin: '10px 0 8px' }}>
                <i style={{ width: '30%' }} />
              </div>
              <div className="caption">0:06 / 0:20</div>
            </div>
          </div>
          <div className="fmt-grid">
            {formats.map((f) => (
              <Focusable
                key={f}
                id={`fmt-${f}`}
                className="btn fmt-btn"
                onSelect={() => onPick(f)}
              >
                {f}
              </Focusable>
            ))}
            <Focusable id="again" className="btn fmt-btn btn-outline" onSelect={onAgain}>
              <IconReplay />
              Play again
            </Focusable>
          </div>
          <p className="muted" style={{ marginTop: 28 }}>
            Dolby Atmos or TrueHD: it reaches the receiver untouched. Dolby Digital or PCM: the audio is being converted.
          </p>
          <Focusable id="back" className="btn" style={{ marginTop: 28 }} onSelect={onBack}>
            Back
          </Focusable>
        </div>
      </Chrome>
    </FocusRoot>
  );
}

export function WizardSummary({
  onFinish,
  onAgain,
  onTestDts,
  dtsChecked,
  convertLabel,
}: {
  onFinish: () => void;
  onAgain: () => void;
  onTestDts: () => void;
  dtsChecked?: boolean;
  convertLabel?: string | null;
}) {
  const dtsDone = Boolean(dtsChecked);
  const dtsFormat = convertLabel ?? 'Not tested yet';
  const rows = [
    ['Dolby Digital', 'Passthrough', 'Sent to receiver'],
    ['Dolby Digital Plus', 'Passthrough', 'Sent to receiver'],
    ['Dolby TrueHD · Atmos', 'Passthrough', 'Confirmed: receiver showed Dolby Atmos'],
    [
      'DTS · DTS-HD MA · DTS:X',
      dtsDone ? 'Converted' : 'Untested',
      dtsDone
        ? `TV has no DTS, so the server converts it to ${dtsFormat}.`
        : 'TV has no DTS, so the server converts it.',
    ],
  ];
  return (
    <FocusRoot initial={dtsDone ? 'finish' : 'dts'}>
      <Chrome step={3}>
        <div style={{ padding: '36px var(--safe-x)' }}>
          <h1 className="h1" style={{ marginBottom: 12 }}>
            Your audio setup
          </h1>
          <p className="muted" style={{ marginBottom: 28 }}>
            Cinefin plays each format this way. One check is still needed before you finish.
          </p>
          <div className="section-label" style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr' }}>
            <span>Format</span>
            <span>Result</span>
            <span>Why</span>
          </div>
          {rows.map(([a, b, c]) => (
            <div
              key={a}
              className="format-row wizard-row"
              style={{ background: 'var(--surface)' }}
            >
              <div>{a}</div>
              <div
                className={`status-chip ${b === 'Untested' ? 'untested' : b === 'Converted' ? 'converted' : 'direct'}`}
              >
                {b}
              </div>
              <div className="why">{c}</div>
            </div>
          ))}
          <div
            className="server-card"
            style={{ width: '100%', height: 'auto', padding: '18px 24px', marginTop: 8 }}
          >
            <Focusable id="dts" className="btn" onSelect={onTestDts}>
              ▶ Test DTS conversion
            </Focusable>
            <span className="muted" style={{ marginLeft: 16 }}>
              Plays a converted clip, then asks what your receiver displays.
              {dtsDone ? ` Result after the check: ${dtsFormat}` : ''}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 20, maxWidth: 1100 }}>
            If you picked Dolby Digital or PCM in a test, that format is marked Converted. If it still plays, just untouched.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'flex-start' }}>
            <div>
              <Focusable id="finish" className="btn btn-finish" disabled={!dtsDone} onSelect={onFinish}>
                Finish
              </Focusable>
              {!dtsDone ? (
                <div className="caption" style={{ marginTop: 8 }}>
                  Available after the DTS check
                </div>
              ) : null}
            </div>
            <Focusable id="again" className="btn" onSelect={onAgain}>
              Run again
            </Focusable>
          </div>
        </div>
      </Chrome>
    </FocusRoot>
  );
}
