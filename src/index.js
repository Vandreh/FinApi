const express = require('express');
const req = require('express/lib/request');
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

// Middlewere
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;
    const customer = customers.find((customer) => customer.cpf === cpf);

    if(!customer) {
        return response.status(400).json({ error: "Customer not found" });
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit') {
            return acc + operation.amount;
        }else{
            return acc - operation.amount;
        }
    }, 0);

    return balance
}

/*
    cpf = string
    name = string
    id = uuid
    statment = [] 
*/

app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if(customerAlreadyExists) {
        return response.status(400).json({error: "Customer already exists!"});
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
});

//app.use(verifyIfExistsAccountCPF);

//app.get("/statement/:cpf", (request, response) => {
    //const { cpf } = request.params;
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    
    return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit",
    };

    customer.statement.push(statementOperation);
    
    return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount) {
        return response.status(400).json({ error: "Insuficient funds!" })
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
        (statement) => statement.created_at.toDateString() ===
        new Date(dateFormat).toDateString()
    );
    
    return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { cpf } = request.headers;
  
    const balance = getBalance(customer.statement);
  
    const customerIndex = customers.findIndex((customer) => customer.cpf === cpf);
  
    if (customerIndex < 0) {
      return response.status.json({ error: "Customer Not found" });
    }
    if (balance > 0) {
      return response
        .status(401)
        .json({
          error:
            "It is not possible to delete an account with a positive balance",
        });
    }
  
    customers.splice(customerIndex, 1);
    return response.status(200).json(customers);
    //return response.status(200).send();
  });

  app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
      const { customer } = request;
      const balance = getBalance(customer.statement);

      return response.json(balance);
  })

app.listen(3333);