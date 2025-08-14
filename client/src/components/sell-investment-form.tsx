import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellInvestmentSchema, type SellInvestment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LocalStorageService } from "@/lib/storage";
import { Investment } from "@shared/schema";

interface SellInvestmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investment: Investment | null;
}

export function SellInvestmentForm({ open, onClose, onSuccess, investment }: SellInvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SellInvestment>({
    resolver: zodResolver(sellInvestmentSchema),
    defaultValues: {
      investmentId: investment?.id || "",
      quantity: 0,
      pricePerUnit: investment?.currentPrice || 0,
    },
  });

  // Reset form when investment changes
  useState(() => {
    if (investment) {
      form.reset({
        investmentId: investment.id,
        quantity: 0,
        pricePerUnit: investment.currentPrice,
      });
    }
  });

  const onSubmit = async (data: SellInvestment) => {
    if (!investment) return;
    
    setIsSubmitting(true);
    try {
      const totalAmount = data.quantity * data.pricePerUnit;
      const newQuantity = investment.quantity - data.quantity;
      
      if (newQuantity < 0) {
        alert("Cannot sell more than you own");
        return;
      }
      
      if (newQuantity === 0) {
        // Remove the investment entirely
        LocalStorageService.deleteInvestment(investment.id);
      } else {
        // Update quantity
        LocalStorageService.updateInvestment(investment.id, { 
          quantity: newQuantity,
          currentPrice: data.pricePerUnit 
        });
      }
      
      // Add sell transaction
      LocalStorageService.addTransaction({
        type: 'sell',
        assetSymbol: investment.symbol,
        assetName: investment.name,
        quantity: data.quantity,
        price: data.pricePerUnit,
        total: totalAmount,
        user: 'Alle',
      });
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error selling investment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!investment) return null;

  const maxQuantity = investment.quantity;
  const estimatedTotal = form.watch("quantity") * form.watch("pricePerUnit");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sell Investment</DialogTitle>
          <DialogDescription>
            Sell shares of {investment.name} ({investment.symbol})
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-sm space-y-1">
            <p><strong>Available:</strong> {maxQuantity} shares</p>
            <p><strong>Current Price:</strong> €{investment.currentPrice.toFixed(2)}</p>
            <p><strong>Total Value:</strong> €{(maxQuantity * investment.currentPrice).toFixed(2)}</p>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Sell</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001" 
                      max={maxQuantity}
                      placeholder={`Max: ${maxQuantity}`}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Share (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Sale price"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium">
                Estimated Total: €{estimatedTotal.toFixed(2)}
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} variant="destructive" className="flex-1">
                {isSubmitting ? "Selling..." : "Sell Shares"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}