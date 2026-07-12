

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius)] shadow-sm mt-4">
      <div className="flex-1 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            Showing <span className="font-medium text-[var(--text-primary)]">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-3 py-1.5 rounded-l-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            
            {/* Simple page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-3.5 py-1.5 border text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "z-10 bg-[var(--brand-color)] border-[var(--brand-color)] text-white"
                    : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-3 py-1.5 rounded-r-md border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
