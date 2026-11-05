import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowRightOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import { post } from '../api';

/**
 * anji-plus 滑块验证码（blockPuzzle）：
 * POST /captcha/get   → { repData: { token, secretKey, originalImageBase64, jigsawImageBase64 } }
 * POST /captcha/check → repCode === '0000' 即通过
 * 登录时 captchaVerification = AES(secretKey, token + '---' + JSON.stringify({ x, y: 5 }))，
 * 注意拼的是明文坐标 JSON（旧前端与后端 verification 的实际约定），不是 check 用的密文 pointJson。
 */
const CAPTCHA_TYPE = 'blockPuzzle';
/** 后端底图设计尺寸 310×155，pointJson 的 x 用这个坐标系（与实际渲染宽度无关） */
const BG_WIDTH = 310;
const HANDLE = 40;
const MIN_DRAG = 10;

interface CaptchaResponse {
  repCode?: string;
  repMsg?: string;
  success?: boolean;
  repData?: {
    token?: string;
    secretKey?: string;
    originalImageBase64?: string;
    jigsawImageBase64?: string;
  };
}

type Phase = 'loading' | 'ready' | 'checking' | 'ok' | 'fail';

/** AES-ECB-PKCS7 → base64，与后端 aj-captcha AESUtil 对齐 */
function aesEncrypt(text: string, secretKey: string): string {
  return CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(secretKey), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

/** clientUid 与旧前端一致：localStorage["slider"] = "slider-<uuid>"，持久化避免每次刷新都换 */
function getClientUid(): string {
  try {
    const saved = localStorage.getItem('slider');
    if (saved) return saved;
    const uuid =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
    const uid = `slider-${uuid}`;
    localStorage.setItem('slider', uid);
    return uid;
  } catch {
    return `slider-${Date.now()}`;
  }
}

export default function LoginCaptcha({
  onVerified,
}: {
  onVerified: (captchaVerification: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [msg, setMsg] = useState('');
  const [images, setImages] = useState<{ bg: string; piece: string }>();
  const [dims, setDims] = useState({ bgW: 0, pieceW: 0 });
  const [left, setLeft] = useState(0);
  const bgRef = useRef<HTMLImageElement>(null);
  const leftRef = useRef(0);
  const drag = useRef<{ startX: number; startLeft: number } | null>(null);
  const tokenRef = useRef('');
  const secretRef = useRef('');

  const refresh = useCallback(async () => {
    setPhase('loading');
    setMsg('');
    setLeft(0);
    leftRef.current = 0;
    try {
      const res = await post<CaptchaResponse>('/captcha/get', {
        captchaType: CAPTCHA_TYPE,
        ts: Date.now(),
        clientUid: getClientUid(),
      });
      const data = res?.repData;
      if (
        res?.repCode !== '0000' ||
        !data?.token ||
        !data.secretKey ||
        !data.originalImageBase64 ||
        !data.jigsawImageBase64
      ) {
        setPhase('fail');
        setMsg(res?.repMsg || '验证码加载失败');
        return;
      }
      tokenRef.current = data.token;
      secretRef.current = data.secretKey;
      setImages({ bg: data.originalImageBase64, piece: data.jigsawImageBase64 });
      setPhase('ready');
    } catch (e) {
      setPhase('fail');
      setMsg((e as Error).message || '验证码加载失败');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const moveTo = (next: number) => {
    const barWidth = bgRef.current?.clientWidth ?? BG_WIDTH;
    const clamped = Math.max(0, Math.min(Math.max(0, barWidth - HANDLE), next));
    leftRef.current = clamped;
    setLeft(clamped);
  };

  const check = async () => {
    const barWidth = bgRef.current?.clientWidth ?? BG_WIDTH;
    // 实际渲染宽度换算回 310 设计坐标；拼图块 y 固定为 5（后端 fixed 模式只比对 x）
    const x = Math.round((leftRef.current * BG_WIDTH) / barWidth);
    const pointJson = aesEncrypt(JSON.stringify({ x, y: 5 }), secretRef.current);
    setPhase('checking');
    try {
      const res = await post<CaptchaResponse>('/captcha/check', {
        captchaType: CAPTCHA_TYPE,
        ts: Date.now(),
        token: tokenRef.current,
        pointJson,
      });
      if (res?.repCode === '0000') {
        setPhase('ok');
        setMsg('验证成功');
        // 后端 BlockPuzzleCaptchaServiceImpl#check 成功后缓存的是
        // AES(secretKey, token + '---' + 解密后的明文坐标 JSON)，verification 直接拿 captchaVerification 查这个 key；
        // 所以这里必须拼明文坐标，拼 check 用的密文 pointJson 会让后端查不到 key、一律返回 6110。
        onVerified(aesEncrypt(`${tokenRef.current}---${JSON.stringify({ x, y: 5 })}`, secretRef.current));
        return;
      }
      setPhase('fail');
      // 6111 是坐标不匹配，统一提示重试；其它 repCode（如 6204 限流）直接透出后端文案
      setMsg(res?.repCode === '6111' ? '验证失败，请重试' : res?.repMsg || '验证失败，请重试');
      setTimeout(() => void refresh(), 1000);
    } catch (e) {
      setPhase('fail');
      setMsg((e as Error).message || '验证失败，请重试');
      setTimeout(() => void refresh(), 1000);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'ready') return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 个别浏览器/合成事件拿不到 pointer 捕获，拖动依然走 pointermove
    }
    drag.current = { startX: e.clientX, startLeft: leftRef.current };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    moveTo(drag.current.startLeft + (e.clientX - drag.current.startX));
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (leftRef.current < MIN_DRAG) {
      moveTo(0);
      return;
    }
    void check();
  };

  const pieceRatio = dims.bgW > 0 && dims.pieceW > 0 ? dims.pieceW / dims.bgW : 47 / BG_WIDTH;
  const hint =
    phase === 'ok'
      ? '验证成功'
      : phase === 'fail'
        ? msg || '验证失败，请重试'
        : phase === 'checking'
          ? '校验中…'
          : '向右拖动滑块完成验证';

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--bp-text-soft)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Security check / 安全验证
      </div>

      <div
        className="bp-corners"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: BG_WIDTH,
          border: '1px solid var(--bp-line)',
          background: 'rgba(21,42,68,0.75)',
        }}
      >
        {images ? (
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img
              ref={bgRef}
              alt="验证码底图"
              src={`data:image/png;base64,${images.bg}`}
              draggable={false}
              onLoad={(e) => {
                const bgW = e.currentTarget.naturalWidth;
                setDims((d) => ({ ...d, bgW }));
              }}
              style={{ width: '100%', display: 'block', userSelect: 'none' }}
            />
            <img
              alt=""
              src={`data:image/png;base64,${images.piece}`}
              draggable={false}
              onLoad={(e) => {
                const pieceW = e.currentTarget.naturalWidth;
                setDims((d) => ({ ...d, pieceW }));
              }}
              style={{
                position: 'absolute',
                left,
                top: 0,
                width: `${pieceRatio * 100}%`,
                height: '100%',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
            <button
              type="button"
              aria-label="刷新验证码"
              title="刷新验证码"
              onClick={() => void refresh()}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 26,
                height: 26,
                padding: 0,
                border: 0,
                cursor: 'pointer',
                color: '#fff',
                background: 'rgba(0,0,0,0.28)',
                lineHeight: '26px',
              }}
            >
              <ReloadOutlined />
            </button>
            {phase === 'loading' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(21,42,68,0.6)',
                  fontSize: 11,
                  color: 'var(--bp-text-soft)',
                }}
              >
                <LoadingOutlined style={{ marginRight: 6 }} />
                验证码加载中…
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              height: 155,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 11,
              color: 'var(--bp-text-soft)',
            }}
          >
            {phase === 'fail' ? (
              <>
                <span>{msg || '验证码加载失败'}</span>
                <a onClick={() => void refresh()}>重试</a>
              </>
            ) : (
              <>
                <LoadingOutlined />
                验证码加载中…
              </>
            )}
          </div>
        )}

        <div
          style={{
            position: 'relative',
            height: HANDLE,
            borderTop: '1px solid var(--bp-line)',
            background: 'rgba(255,255,255,0.03)',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: left,
              background: 'rgba(74,144,217,0.22)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: phase === 'fail' ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
              pointerEvents: 'none',
            }}
          >
            {hint}
          </span>
          <div
            role="slider"
            aria-label="向右拖动完成验证"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(left)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: HANDLE,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: phase === 'ok' ? 'rgba(74,144,217,0.55)' : 'rgba(74,144,217,0.35)',
              border: '1px solid var(--bp-line)',
              color: '#fff',
              cursor: phase === 'ready' ? 'grab' : 'default',
              touchAction: 'none',
            }}
          >
            {phase === 'ok' ? '✓' : <ArrowRightOutlined />}
          </div>
        </div>
      </div>
    </div>
  );
}
