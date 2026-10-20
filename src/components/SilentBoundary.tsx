'use client';

/**
 * SilentBoundary — the seatbelt for global chrome mounted in the root
 * layout (attribution sync, analytics, translate gate, capture pill).
 * Those components render little or nothing and must NEVER be able to
 * take down the whole app: if one throws — during render, hydration, or
 * a store update — this boundary swallows it, logs it, and renders
 * nothing in its place. The page itself is untouched.
 *
 * (The visible ErrorBoundary is for page content, where the user should
 * see that something failed and get a retry. Global chrome failing
 * silently is the correct degradation.)
 */
import React from 'react';

interface Props {
  children: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export default class SilentBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[WorldEye] ${this.props.name || 'global component'} disabled after error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
