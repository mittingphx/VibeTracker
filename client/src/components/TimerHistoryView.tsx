import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Calendar as CalendarIcon, Edit, RotateCcw, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { formatDateTime } from "@/utils/timeUtils";
import { TimerHistory, Timer } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TimerHistoryViewProps {
  timerId: number;
  timerName: string;
  onClose: () => void;
}

export default function TimerHistoryView({ timerId, timerName, onClose }: TimerHistoryViewProps) {
  const { toast } = useToast();
  const [editHistoryId, setEditHistoryId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editTime, setEditTime] = useState<string>("00:00");
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [addHistoryDate, setAddHistoryDate] = useState<Date>(new Date());
  const [addHistoryTime, setAddHistoryTime] = useState<string>(
    format(new Date(), "HH:mm")
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Quick add timeframes
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  
  const formatOptions = [
    { label: "5 minutes ago", minutes: 5 },
    { label: "15 minutes ago", minutes: 15 },
    { label: "30 minutes ago", minutes: 30 },
    { label: "1 hour ago", minutes: 60 },
    { label: "2 hours ago", minutes: 120 },
    { label: "4 hours ago", minutes: 240 },
  ];

  // Fetch timer history
  const { data: historyData, isLoading, refetch } = useQuery<TimerHistory[]>({
    queryKey: ["/api/timers", timerId, "history"],
    queryFn: async () => {
      const response = await fetch(`/api/timers/${timerId}/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch timer history");
      }
      return response.json();
    }
  });

  // Edit history mutation
  const editHistoryMutation = useMutation({
    mutationFn: async ({ id, timestamp, isActive = true }: { id: number; timestamp: Date; isActive?: boolean }) => {
      return apiRequest("PATCH", `/api/history/${id}`, { timestamp, isActive });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timer press updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timers", timerId, "history"] });
      setShowEditDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete history mutation
  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/history/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timer press deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timers", timerId, "history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Add history mutation
  const addHistoryMutation = useMutation({
    mutationFn: async (timestamp: Date) => {
      return apiRequest("POST", `/api/timers/${timerId}/press`, { timestamp });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timer press added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timers", timerId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      setShowAddDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add press: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // When edit button is clicked, open the dialog and set initial values
  const handleEdit = (history: TimerHistory) => {
    setEditHistoryId(history.id);
    setEditDate(new Date(history.timestamp));
    setEditTime(format(new Date(history.timestamp), "HH:mm"));
    setShowEditDialog(true);
  };

  // When saving edit changes
  const handleSaveEdit = () => {
    if (!editHistoryId) return;
    
    // Combine date and time
    const combinedDate = new Date(editDate);
    const [hours, minutes] = editTime.split(":").map(Number);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    // Must provide isActive as true (required by the server API)
    editHistoryMutation.mutate({ 
      id: editHistoryId, 
      timestamp: combinedDate,
      isActive: true
    });
  };

  // When deleting a history entry
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this timer press? This action cannot be undone.")) {
      deleteHistoryMutation.mutate(id);
    }
  };
  
  // Add a new press with custom date/time
  const handleAddHistory = () => {
    // Combine date and time
    const combinedDate = new Date(addHistoryDate);
    const [hours, minutes] = addHistoryTime.split(":").map(Number);
    combinedDate.setHours(hours, minutes, 0, 0);
    
    addHistoryMutation.mutate(combinedDate);
  };
  
  // Add a new press with quick timeframe (5min ago, 30min ago, etc)
  const handleQuickAdd = (minutesAgo: number) => {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);
    addHistoryMutation.mutate(timestamp);
    setQuickAddOpen(false);
  };

  const isMobile = useIsMobile();
  
  return (
    <div className={`flex flex-col h-full ${isMobile ? 'bg-background' : 'border rounded-lg bg-background'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">History for "{timerName}"</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 flex flex-row gap-2">
        {/* Add History Button */}
        <Button 
          variant="outline" 
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Past Event
        </Button>
        
        {/* Quick Add Button */}
        <Popover open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
            >
              <Clock className="h-4 w-4" /> Quick Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2">
            <div className="flex flex-col gap-1">
              {formatOptions.map((option) => (
                <Button 
                  key={option.minutes} 
                  variant="ghost" 
                  className="justify-start font-normal"
                  onClick={() => handleQuickAdd(option.minutes)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !historyData || historyData.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No history found for this timer.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData
                .filter(entry => entry.isActive) // Only show active entries
                .map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {formatDateTime(new Date(entry.timestamp))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(entry)}
                      title="Edit timestamp"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry.id)}
                      title="Delete record"
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timer Press</DialogTitle>
            <DialogDescription>
              Update the date and time of this timer press.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => setEditDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editHistoryMutation.isPending}>
              {editHistoryMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timer Press</DialogTitle>
            <DialogDescription>
              Add a custom date and time for this timer press.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="addDate">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="addDate"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !addHistoryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {addHistoryDate ? format(addHistoryDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={addHistoryDate}
                    onSelect={(date) => setAddHistoryDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="addTime">Time</Label>
              <Input
                id="addTime"
                type="time"
                value={addHistoryTime}
                onChange={(e) => setAddHistoryTime(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHistory} disabled={addHistoryMutation.isPending}>
              {addHistoryMutation.isPending ? "Adding..." : "Add Press"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}