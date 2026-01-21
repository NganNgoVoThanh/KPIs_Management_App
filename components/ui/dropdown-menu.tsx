"use client"

import * as React from "react"

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Handle click outside using the container ref
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If menu is open and click is outside the specific container, close it
      if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative inline-block">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child, {
              onClick: (e: React.MouseEvent) => {
                // Determine if we should toggle
                setIsOpen(!isOpen)
              },
              'data-state': isOpen ? 'open' : 'closed'
            } as any)
          }
          if (child.type === DropdownMenuContent) {
            if (isOpen) {
              return React.cloneElement(child, {
                // No longer need explicit onClose from child, handled by wrapper
              } as any)
            }
            return null
          }
        }
        return child
      })}
    </div>
  )
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  { asChild?: boolean; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }
>(({ asChild, children, onClick, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref,
      onClick,
    })
  }

  return (
    <button ref={ref} onClick={onClick} {...props}>
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export const DropdownMenuContent = ({
  children,
  align = 'start',
  className = ""
}: {
  children: React.ReactNode
  align?: 'start' | 'end'
  // Keeping onClose in type definition for compatibility if needed, but not using it
  onClose?: () => void
  className?: string
}) => {
  return (
    <div
      data-dropdown-content
      className={`absolute top-full mt-2 min-w-[8rem] rounded-md border bg-white shadow-lg z-[9999] ${align === 'end' ? 'right-0' : 'left-0'
        } ${className}`}
    >
      {children}
    </div>
  )
}

export const DropdownMenuLabel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-2 py-1.5 text-sm font-semibold ${className}`}>{children}</div>
)

export const DropdownMenuSeparator = () => (
  <div className="-mx-1 my-1 h-px bg-gray-200" />
)

export const DropdownMenuItem = ({
  children,
  onClick,
  className = ""
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) => (
  <div
    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)