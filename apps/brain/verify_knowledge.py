import asyncio
from app.services.knowledge_service import knowledge_service

async def test_knowledge():
    print("Testing Knowledge Service with AmPac Data...")
    
    # Test 1: SBA 504 details
    query1 = "What is the down payment for an SBA 504 loan?"
    print(f"\nQuery: {query1}")
    response1 = await knowledge_service.query(query1)
    print(f"Answer: {response1.answer}")
    
    # Test 2: Eligibility
    query2 = "Do I qualify if I am not a US citizen?"
    print(f"\nQuery: {query2}")
    response2 = await knowledge_service.query(query2)
    print(f"Answer: {response2.answer}")

if __name__ == "__main__":
    asyncio.run(test_knowledge())
