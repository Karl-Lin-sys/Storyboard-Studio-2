/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ChatPanel from './components/ChatPanel';
import StoryboardGenerator from './components/StoryboardGenerator';

export default function App() {
  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans overflow-hidden selection:bg-blue-500/30">
      <StoryboardGenerator />
      <ChatPanel />
    </div>
  );
}

