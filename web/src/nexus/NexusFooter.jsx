import React from 'react';
import { PRODUCT, PARENT } from './product.js';

// Sits at the very bottom of every layout. tenantName is the customer's company; without one it shows the product name.
export default function NexusFooter({ tenantName, className = '' }) {
  return (
    <footer className={'nx-footer ' + className}>
      <p>© {new Date().getFullYear()} {tenantName || PRODUCT.name} | Powered by {PARENT.engine}</p>
    </footer>
  );
}
