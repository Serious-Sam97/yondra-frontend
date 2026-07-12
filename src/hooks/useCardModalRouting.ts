"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { CardInterface } from "@/interfaces/CardInterface";

interface UseCardModalRoutingParams {
  cards: CardInterface[];
  setSelectedCard: Dispatch<SetStateAction<CardInterface | null>>;
  setIsCardVisible: Dispatch<SetStateAction<boolean>>;
  setNewCardSectionId: Dispatch<SetStateAction<number | null>>;
}

// Reflect the open card in the URL as `?card=<id>` so the address bar itself is a
// shareable card link and the browser Back button closes the card. We use the History
// API directly (not the Next router) to avoid re-running the route/refetching the board.
// Also handles deep links (`/boards/{id}?card={cardId}`) and Back/Forward (popstate).
export function useCardModalRouting({
  cards,
  setSelectedCard,
  setIsCardVisible,
  setNewCardSectionId,
}: UseCardModalRoutingParams) {
  const setCardParam = useCallback((cardId: number | string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (cardId != null) params.set("card", String(cardId));
    else params.delete("card");
    const qs = params.toString();
    return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  }, []);

  // True when *we* pushed a history entry for the currently-open card (vs. arriving via a
  // deep link, where the `?card` entry already existed and must not be popped away).
  const pushedCardEntryRef = useRef(false);

  // Open a card. `pushUrl` adds a history entry (so Back closes it) — skipped when we're
  // merely reacting to a URL that already points here (deep link / popstate).
  const openCard = useCallback(
    (card: CardInterface, pushUrl = true) => {
      setSelectedCard(card);
      setIsCardVisible(true);
      if (
        pushUrl &&
        new URLSearchParams(window.location.search).get("card") !==
          String(card.id)
      ) {
        window.history.pushState(null, "", setCardParam(card.id));
        pushedCardEntryRef.current = true;
      }
    },
    [setCardParam],
  );

  // Close the card and drop `?card` from the URL. If we pushed the entry ourselves, pop it
  // (history.back) so Back/Forward stay clean — the popstate handler then closes the modal.
  // Otherwise (deep link) strip the param in place without touching the history stack.
  const closeCard = useCallback(() => {
    if (
      pushedCardEntryRef.current &&
      new URLSearchParams(window.location.search).has("card")
    ) {
      pushedCardEntryRef.current = false;
      window.history.back();
      return;
    }
    setIsCardVisible(false);
    setSelectedCard(null);
    setNewCardSectionId(null);
    if (new URLSearchParams(window.location.search).has("card")) {
      window.history.replaceState(null, "", setCardParam(null));
    }
  }, [setCardParam]);

  // Deep-link: a notification links to `/boards/{id}?card={cardId}`. Once the
  // board's cards are loaded, open the referenced card (once). Don't push a new
  // history entry — the URL already points here.
  const openedDeepLinkRef = useRef(false);
  useEffect(() => {
    if (openedDeepLinkRef.current || cards.length === 0) return;
    const cardId = Number(
      new URLSearchParams(window.location.search).get("card"),
    );
    if (!cardId) return;
    const target = cards.find((c) => c.id === cardId);
    if (target) {
      openedDeepLinkRef.current = true;
      openCard(target, false);
    }
  }, [cards, openCard]);

  // Keep the modal in sync with Back/Forward navigation: when `?card` changes, open the
  // referenced card or close the modal to match.
  useEffect(() => {
    const onPop = () => {
      const cardId = Number(
        new URLSearchParams(window.location.search).get("card"),
      );
      const target = cardId ? cards.find((c) => c.id === cardId) : null;
      if (target) {
        // Landed on a `?card` entry (e.g. Forward) — treat it as our pushed entry so a
        // subsequent close pops it cleanly.
        pushedCardEntryRef.current = true;
        setSelectedCard(target);
        setIsCardVisible(true);
      } else {
        pushedCardEntryRef.current = false;
        setIsCardVisible(false);
        setSelectedCard(null);
        setNewCardSectionId(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [cards]);

  return { openCard, closeCard };
}
