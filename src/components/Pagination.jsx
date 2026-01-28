import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-4">
            {/* Info text */}
            <div className="text-sm text-zinc-400 font-medium">
                แสดง <span className="text-white font-bold font-num">{startItem}</span> - <span className="text-white font-bold font-num">{endItem}</span> จาก <span className="text-white font-bold font-num">{totalItems}</span> รายการ
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700 hover:border-amber-500/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800 disabled:hover:border-white/10"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-3 py-2 text-zinc-500">
                                    ...
                                </span>
                            );
                        }

                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`min-w-[40px] px-3 py-2 rounded-lg font-bold font-num text-sm transition-all border ${currentPage === page
                                        ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                        : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 hover:border-amber-500/50 hover:text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next button */}
                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 hover:bg-zinc-700 hover:border-amber-500/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800 disabled:hover:border-white/10"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
