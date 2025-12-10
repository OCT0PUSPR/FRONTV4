// src/pages/ApprovalActions.tsx
import React, { useState } from 'react'
import { Check, X, Send } from 'lucide-react'
import { Button } from '../../@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../@/components/ui/dialog'
import { Textarea } from '../../@/components/ui/textarea'
import { Label } from '../../@/components/ui/label'

interface ApprovalActionsProps {
  taskStatus: string
  isSubmitting: boolean
  onApprove: () => Promise<boolean | void>
  onReject: (reason: string) => Promise<boolean | void>
}

export function ApprovalActions({
  taskStatus,
  isSubmitting,
  onApprove,
  onReject,
}: ApprovalActionsProps) {
  const [reason, setReason] = useState('')
  const [isRejectModalOpen, setRejectModalOpen] = useState(false)

  const handleRejectSubmit = async () => {
    const success = await onReject(reason)
    if (success) {
      setRejectModalOpen(false)
      setReason('')
    }
  }

  if (taskStatus !== 'pending') {
    return (
      <Card className="sticky top-8">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4 text-center text-muted-foreground">
            This task has already been {taskStatus}.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-3">
        <Button
          size="lg"
          onClick={onApprove}
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="mr-2 h-5 w-5" />
          {isSubmitting ? 'Approving...' : 'Approve'}
        </Button>

        <Dialog open={isRejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="destructive" disabled={isSubmitting} className="w-full">
              <X className="mr-2 h-5 w-5" />
              Reject / Send Back
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Corrections</DialogTitle>
              <DialogDescription>
                Please provide a note for the requester detailing the
                reason for rejection or the corrections required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="reason" className="text-left">
                Note / Reason
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., 'Please update the product image as well.'"
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectSubmit}
                disabled={isSubmitting || reason.trim() === ''}
                variant="destructive"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm and Send Back'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}