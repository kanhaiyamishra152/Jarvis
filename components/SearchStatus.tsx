
import React from 'react';
import { type SearchState } from '../types';
import { SearchWebIcon } from './Icons';

interface SearchStatusProps {
    state: SearchState;
}

const SearchStatus: React.FC<SearchStatusProps> = ({ state }) => {
    if (state === 'idle') {
        return null;
    }

    const messages = {
        searching: 'Searching the web for the latest information...',
        synthesizing: 'Synthesizing information and generating response...',
    };

    return (
        <div className="px-6 py-2 bg-gray-800/50 border-b border-t border-blue-500/10 flex items-center justify-center gap-3 text-sm text-cyan-300 transition-opacity duration-300">
            <SearchWebIcon className="w-5 h-5 animate-spin" />
            <p>{messages[state]}</p>
        </div>
    );
};

export default SearchStatus;
