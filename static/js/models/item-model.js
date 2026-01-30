// Data model: ItemModel wraps a raw item/listing and provides consistent derived fields.
// This prevents every tab from inventing new rules for the same entity.

class ItemModel {
  constructor(raw) {
    this.raw = raw || {};
  }

  get id() { return this.raw.id; }
  get username() { return this.raw.username; }
  get slot() { return this.raw.slot; }
  get baseItemId() { return this.raw.base_item_id; }
  get powerRaw() { return this.raw.power; }

  get name() {
    return Utils.getItemName(this.baseItemId, this.slot) || 'Unknown Item';
  }

  get powerPercent() {
    const p = parseFloat(this.powerRaw || 0);
    return (p * 100);
  }

  get powerPercentDisplay() {
    return `${this.powerPercent.toFixed(1)}%`;
  }

  get powerType() {
    return Utils.getPowerType(this.raw);
  }

  get statColor() {
    return Utils.getStatColor(this.powerType);
  }

  get range() { return Utils.getRange(this.raw); }
  get twoHanded() { return Utils.getTwoHanded(this.raw); }
  get isTwoHanded() { return !!this.twoHanded; }

  get totalGold() { return Utils.getTotalGoldValue(this.raw); }

  get slotMeta() { return DesignSystem.getSlotMeta(this.slot); }

  // Used for analysis comparisons
  get statTypes() { return Utils.getItemStatTypes(this.raw, true); }

  get analysisData() {
    return Utils.getAnalysisForItem(this.baseItemId, this.slot, this.statTypes, this.isTwoHanded);
  }

  get slotAnalysisData() {
    return Utils.getSlotAnalysis(this.slot, this.powerType);
  }


// Inventory status helpers (based on globally computed maps)
get isEquipped() {
  const id = String(this.id ?? '');
  return !!(State.equippedItemMap && State.equippedItemMap[id]);
}

get isListed() {
  const id = String(this.id ?? '');
  return !!(State.listedItemMap && State.listedItemMap[id]);
}

get status() {
  if (this.isListed) return 'listed';
  if (this.isEquipped) return 'equipped';
  return 'available';
}

}
