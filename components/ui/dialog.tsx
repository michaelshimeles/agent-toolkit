"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className || ""}`}
    // #region agent log
    onClick={(e) => {
      fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dialog.tsx:DialogOverlay:click',message:'Overlay clicked',data:{target:(e.target as HTMLElement)?.tagName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    }}
    // #endregion
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dialog.tsx:DialogContent:mount',message:'DialogContent mounted',data:{className},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
  }, [className]);
  // #endregion
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg ${className || ""}`}
        // #region agent log
        onPointerDownOutside={(e) => {
          fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dialog.tsx:DialogContent:pointerDownOutside',message:'Pointer down outside dialog',data:{target:(e.target as HTMLElement)?.tagName,className:(e.target as HTMLElement)?.className?.slice?.(0,100),prevented:false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
          // Prevent dialog from closing when interacting with Select portals (base-ui)
          const target = e.target as HTMLElement;
          if (target?.closest('[data-slot="select-content"]') || target?.closest('[data-slot="select-item"]') || target?.closest('[data-base-ui-select-popup]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dialog.tsx:DialogContent:interactOutside',message:'Interact outside dialog',data:{target:(e.target as HTMLElement)?.tagName,className:(e.target as HTMLElement)?.className?.slice?.(0,100),prevented:false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
          // Prevent dialog from closing when interacting with Select portals (base-ui)
          const target = e.target as HTMLElement;
          if (target?.closest('[data-slot="select-content"]') || target?.closest('[data-slot="select-item"]') || target?.closest('[data-base-ui-select-popup]')) {
            e.preventDefault();
          }
        }}
        // #endregion
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ""}`}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ""}`}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`text-sm text-gray-500 ${className || ""}`}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
