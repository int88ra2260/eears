// src/hooks/useMediaQuery.js
import { useEffect, useState } from "react";

export default function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;
    const mql = window.matchMedia(query);

    // 初始同步
    setMatches(mql.matches);

    // 去抖處理，避免 resize 過於頻繁
    let frame;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setMatches(mql.matches));
    };

    // addEventListener 新版 API，fallback 到 addListener
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);

    return () => {
      cancelAnimationFrame(frame);
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}





































