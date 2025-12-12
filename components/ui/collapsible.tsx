"use client"

import * as React from "react"

export const Collapsible = ({ 
  open, 
  onOpenChange, 
  children 
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = React.useState(open || false)
  
  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open)
  }, [open])
  
  const toggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onOpenChange?.(newState)
  }
  
  return (
    <div data-state={isOpen ? "open" : "closed"}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === CollapsibleTrigger) {
            return React.cloneElement(child, { onClick: toggle } as any)
          }
          if (child.type === CollapsibleContent) {
            return React.cloneElement(child, { isOpen } as any)
          }
        }
        return child
      })}
    </div>
  )
}

export const CollapsibleTrigger = ({ 
  asChild, 
  children, 
  onClick 
}: {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick })
  }
  
  return <button onClick={onClick}>{children}</button>
}

export const CollapsibleContent = ({ 
  children, 
  className = "",
  isOpen
}: {
  children: React.ReactNode
  className?: string
  isOpen?: boolean
}) => {
  if (!isOpen) return null
  
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="pb-2 pt-0">
        {children}
      </div>
    </div>
  )
}