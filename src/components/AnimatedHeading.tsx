"use client";

import { Fragment, useEffect, useState } from "react";

const CHAR_DELAY = 30; // ms between characters
const INITIAL_DELAY = 200; // ms before the whole animation begins
const CHAR_DURATION = 500; // ms per-character transition

/**
 * Character-by-character entrance heading. Splits `text` on "\n" into lines,
 * each line into words, each word into characters. Every character is an
 * inline-block <span> that eases in from opacity 0 / translateX(-18px), with a
 * staggered delay of (lineIndex * lineLength + positionInLine) * CHAR_DELAY.
 *
 * Words are wrapped in an inline-block so a line only ever wraps at spaces —
 * never mid-word. The visible characters are aria-hidden; the readable text is
 * exposed once via aria-label so assistive tech doesn't spell it out.
 */
export function AnimatedHeading({
  text,
  className = "",
  style = {},
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), INITIAL_DELAY);
    return () => clearTimeout(t);
  }, []);

  const lines = text.split("\n");

  const charSpan = (char: string, delay: number, key: number) => (
    <span
      key={key}
      className="inline-block"
      style={{
        opacity: animate ? 1 : 0,
        transform: animate ? "translateX(0)" : "translateX(-18px)",
        transition: `opacity ${CHAR_DURATION}ms ease, transform ${CHAR_DURATION}ms ease`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {char}
    </span>
  );

  return (
    <h1 className={className} style={style} aria-label={text.replace(/\n/g, " ")}>
      {lines.map((line, lineIndex) => {
        const lineLength = line.length;
        const words = line.split(" ");
        let pos = 0; // running character position within the line (incl. spaces)

        return (
          <span key={lineIndex} className="block" aria-hidden="true">
            {words.map((word, wordIndex) => {
              const start = pos;
              const wordEl = (
                <span className="inline-block">
                  {word
                    .split("")
                    .map((ch, ci) =>
                      charSpan(ch, (lineIndex * lineLength + start + ci) * CHAR_DELAY, ci)
                    )}
                </span>
              );
              pos += word.length;
              const isLast = wordIndex === words.length - 1;
              if (!isLast) pos += 1; // breakable space counts toward the stagger

              return (
                <Fragment key={wordIndex}>
                  {wordEl}
                  {!isLast ? <span> </span> : null}
                </Fragment>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}
