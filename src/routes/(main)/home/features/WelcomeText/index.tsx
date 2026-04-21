import { Flexbox } from '@lobehub/ui';
import { LoadingDots } from '@lobehub/ui/chat';
import { createStaticStyles, cssVar } from 'antd-style';
import { shuffle } from 'es-toolkit/compat';
import { memo, type MouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHomeDailyBrief } from '@/hooks/useHomeDailyBrief';
import { useStableNavigate } from '@/hooks/useStableNavigate';

interface LinkSpan {
  end: number;
  href: string;
  start: number;
  text: string;
}

interface ParsedSentence {
  links: LinkSpan[];
  plain: string;
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

const stripBold = (text: string): string => text.replaceAll('**', '');

const parseSentence = (raw: string): ParsedSentence => {
  const cleaned = stripBold(raw);
  const links: LinkSpan[] = [];
  let plain = '';
  MARKDOWN_LINK_RE.lastIndex = 0;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKDOWN_LINK_RE.exec(cleaned)) !== null) {
    plain += cleaned.slice(lastIndex, m.index);
    const start = plain.length;
    plain += m[1];
    links.push({ end: plain.length, href: m[2], start, text: m[1] });
    lastIndex = m.index + m[0].length;
  }
  plain += cleaned.slice(lastIndex);
  return { links, plain };
};

interface AutoLinkPattern {
  build: (match: string) => string;
  regex: RegExp;
}

const AUTO_LINK_PATTERNS: AutoLinkPattern[] = [
  {
    build: (match) => `https://linear.app/lobehub/issue/${match}`,
    regex: /LOBE-\d+/g,
  },
  {
    build: (match) => `https://github.com/lobehub/lobehub/issues/${match.slice(1)}`,
    regex: /#\d+/g,
  },
];

const linkStyles = createStaticStyles(({ css, cssVar }) => ({
  link: css`
    padding-block-end: 1px;
    color: ${cssVar.colorText};
    text-decoration: none;
    background: linear-gradient(to top, ${cssVar.colorPrimaryBgHover} 30%, transparent 30%);
  `,
}));

const isExternal = (href: string): boolean => /^https?:\/\//i.test(href);

interface BriefLinkProps {
  children: ReactNode;
  href: string;
}

const BriefLink = memo<BriefLinkProps>(({ href, children }) => {
  const navigate = useStableNavigate();

  if (isExternal(href)) {
    return (
      <a className={linkStyles.link} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a className={linkStyles.link} href={href} onClick={onClick}>
      {children}
    </a>
  );
});

const renderWithLinks = (plain: string, embeddedLinks: LinkSpan[]): ReactNode[] => {
  const matches: LinkSpan[] = [...embeddedLinks];
  for (const { regex, build } of AUTO_LINK_PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(plain)) !== null) {
      matches.push({
        end: m.index + m[0].length,
        href: build(m[0]),
        start: m.index,
        text: m[0],
      });
    }
  }
  if (matches.length === 0) return [plain];

  matches.sort((a, b) => a.start - b.start || a.end - b.end);
  const accepted: LinkSpan[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      accepted.push(m);
      lastEnd = m.end;
    }
  }

  const out: ReactNode[] = [];
  let cursor = 0;
  for (const [i, m] of accepted.entries()) {
    if (m.start > cursor) out.push(plain.slice(cursor, m.start));
    out.push(
      <BriefLink href={m.href} key={`${m.start}-${i}`}>
        {m.text}
      </BriefLink>,
    );
    cursor = m.end;
  }
  if (cursor < plain.length) out.push(plain.slice(cursor));
  return out;
};

const TYPING_INTERVAL_MS = 21;
const PAUSE_DURATION_MS = 30_000;

interface DailyTypewriterProps {
  onSentenceComplete: () => void;
  sentenceIndex: number;
  sentences: ParsedSentence[];
}

const DailyTypewriter = memo<DailyTypewriterProps>(
  ({ sentences, sentenceIndex, onSentenceComplete }) => {
    const [partial, setPartial] = useState('');
    const [phase, setPhase] = useState<'typing' | 'pause'>('typing');
    const [charIndex, setCharIndex] = useState(0);

    const onSentenceCompleteRef = useRef(onSentenceComplete);
    useEffect(() => {
      onSentenceCompleteRef.current = onSentenceComplete;
    }, [onSentenceComplete]);

    useEffect(() => {
      setPartial('');
      setCharIndex(0);
      setPhase('typing');
    }, [sentenceIndex, sentences]);

    useEffect(() => {
      if (sentences.length === 0) return;
      const current = sentences[sentenceIndex % sentences.length].plain;
      let timer: ReturnType<typeof setTimeout> | undefined;

      switch (phase) {
        case 'typing': {
          if (charIndex < current.length) {
            timer = setTimeout(() => {
              setPartial(current.slice(0, charIndex + 1));
              setCharIndex((c) => c + 1);
            }, TYPING_INTERVAL_MS);
          } else {
            setPhase('pause');
          }
          break;
        }
        case 'pause': {
          timer = setTimeout(() => {
            onSentenceCompleteRef.current();
          }, PAUSE_DURATION_MS);
          break;
        }
      }

      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [phase, charIndex, sentenceIndex, sentences]);

    const isPaused = phase === 'pause';
    const showCursor = !isPaused;
    const currentSentence = sentences[sentenceIndex % sentences.length];

    return (
      <Flexbox
        style={{
          fontSize: 16,
          height: '3.2em',
          lineHeight: 1.6,
          overflow: 'hidden',
          paddingInlineStart: 5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <span>
          {isPaused ? renderWithLinks(currentSentence.plain, currentSentence.links) : partial}
          {showCursor && (
            <span
              style={{ display: 'inline-block', marginInlineStart: 4, verticalAlign: 'middle' }}
            >
              <LoadingDots color={cssVar.colorText} size={12} variant={'pulse'} />
            </span>
          )}
        </span>
      </Flexbox>
    );
  },
);

const WelcomeText = memo(() => {
  const { t } = useTranslation('welcome');

  const { pairs, currentIndex, advance } = useHomeDailyBrief();

  const dailySentences = useMemo<ParsedSentence[]>(
    () => pairs.map((p) => parseSentence(p.welcome)),
    [pairs],
  );

  const fallbackSentences = useMemo<ParsedSentence[]>(() => {
    const messages = t('welcomeMessages', { returnObjects: true }) as Record<string, string>;
    const pool = shuffle(Object.values(messages));
    if (pool.length === 0) return [];

    const lines: string[] = [];
    for (let i = 0; i < pool.length; i += 2) {
      const a = pool[i];
      const b = pool[i + 1];
      const second = b ?? pool[0];
      lines.push(second && second !== a ? `${a}\n${second}` : a);
    }
    return lines.map((s) => ({ links: [], plain: s }));
  }, [t]);

  const useDaily = dailySentences.length > 0;
  const sentences = useDaily ? dailySentences : fallbackSentences;
  const onAdvance = useDaily ? advance : NOOP;
  const sentenceIndex = useDaily ? currentIndex % Math.max(sentences.length, 1) : 0;

  if (sentences.length === 0) return null;

  return (
    <DailyTypewriter
      sentenceIndex={sentenceIndex}
      sentences={sentences}
      onSentenceComplete={onAdvance}
    />
  );
});

const NOOP = () => undefined;

export default WelcomeText;
