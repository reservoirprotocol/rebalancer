# Rebalancer Backend Service

The **Rebalancer Backend Service** facilitates the **Rebalancing** workflow, enabling secure and efficient execution of orders proposed by bonded Fillers. This service exclusively handles Rebalancing, while all Filling operations are managed by an external service.

---

## **Rebalancing Workflow**

The Rebalancing workflow operates as follows:

1. **Filler Requests Quote**  
   The Filler sends a request for an indicative price.

2. **Rebalancer Provides Indicative Price**  
   The Rebalancer responds with an indicative quote for the requested operation.

3. **Filler Provides Signed Order**  
   The Filler generates and submits a signed order to the Rebalancer.

4. **Rebalancer Executes Order**  
   The Rebalancer validates the signed order and executes it, ensuring that the Filler is bonded and compliant.

---

## **Key Features**

- Supports **Rebalancing** only.
- Validates bonding requirements for all Fillers.
- Provides indicative pricing and executes signed orders from bonded Fillers.

---

## **Key Requirements**

- The **Filler** must be **bonded** to ensure accountability and trust.
- The Rebalancer service does not handle Filling operations; those are managed by an external service.

---

## **Usage**

The Rebalancer Backend Service provides APIs for:

- Requesting indicative quotes.
- Submitting signed orders.
- Executing validated rebalancing operations.

For more details, refer to the implementation and API documentation.
