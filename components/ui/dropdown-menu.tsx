"use client"

import * as React from "react"

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div className="relative inline-block">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child, {
              onClick: () => setIsOpen(!isOpen),
              'data-state': isOpen ? 'open' : 'closed'
            } as any)
          }
          if (child.type === DropdownMenuContent && isOpen) {
            return React.cloneElement(child, {
              onClose: () => setIsOpen(false)
            } as any)
          }
        }
        return child
      })}
    </div>
  )
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  { asChild?: boolean; children: React.ReactNode; onClick?: () => void }
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
  onClose
}: {
  children: React.ReactNode
  align?: 'start' | 'end'
  onClose?: () => void
}) => {
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (contentRef.current && !contentRef.current.contains(target)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={contentRef}
      data-dropdown-content
      className={`absolute top-full mt-2 min-w-[8rem] rounded-md border bg-white shadow-lg z-[9999] ${
        align === 'end' ? 'right-0' : 'left-0'
      }`}
      style={{ display: 'block' }}
    >
      {children}
    </div>
  )
}

export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 py-1.5 text-sm font-semibold">{children}</div>
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