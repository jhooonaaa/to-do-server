import express from "express";
import db from "./db.js";
import cors from 'cors';

const app = express();
app.use(cors());
//parse json
app.use(express.json());
const PORT =  3000;


//get user
app.get('/get-users', (req, res) => {
    const query = "SELECT * FROM users";
    db.query(query)
    .then(users => {
        res.status(200).json({users: users.rows})
    });
});

//get-titles
app.get('/get-titles', (req, res) => {
    const query = "SELECT * FROM titles";
    db.query(query)
    .then(titles=> {
        res.status(200).json({ titles: titles.rows});
    });

}); 

 //get-lists
app.get('/get-lists', (req, res) => {
    const query = "SELECT * FROM lists";
    db.query(query)
    .then(lists=> {
        res.status(200).json({ lists: lists.rows});
    });

}); 

app.get('/get-lists/:title_id', (req, res) => {
    const titleId = req.params.title_id;
    const query = "SELECT * FROM lists WHERE title_id = $1";

    db.query(query, [titleId])
    .then(lists => {
        res.status(200).json({ lists: lists.rows });
    })
    .catch(error => {
        res.status(500).json({ error: "Error fetching lists" });
    });
});



app.post('/check-accounts', (req, res) => {
    const {username, password } = req.body;

    const query = "SELECT * FROM accounts WHERE username=$1 AND password=$2";

    db.query(query, [username, password])
    .then(result => {
        if(result.rowCount > 0) {
            res.status(200).json({exit: true});
        }
        else{
            res.status(200).json({exit: false});
        }
        });
    });

    

    //register
    app.post('/register', (req, res) =>{
        const {username, password, fname, lname } = req.body;

        const query = "INSERT INTO accounts (username, password, fname, lname) VALUES ($1,$2,$3,$4)";
        db.query(query, [username, password, fname, lname])
        .then(result => {
            res.status(200).json({success: true});
        });
})

app.post('/add-todo', (req, res) => {
    const { username, title, list_desc } = req.body;
    const date_modified = new Date().toISOString().split('T')[0];
    const status = false;
    
    const titleQuery = "INSERT INTO titles (username, title, date_modified, status) VALUES ($1, $2, $3, $4) RETURNING id";
    db.query(titleQuery, [username, title, date_modified, status], (err, titleResult) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: "Database error" });
        }
        
        const title_id = titleResult.rows[0].id;
        
       
        const listQuery = "INSERT INTO lists (title_id, list_desc, status) VALUES ($1, $2, $3)";
        
        list_desc.forEach(desc => {
            db.query(listQuery, [title_id, desc, status], (listErr) => {
                if (listErr) {
                    console.error(listErr);
                    
                }
            });
        });
        
       res.status(200).json({ success: true, message: "Succesfully Added"  });
       
    });
}); 

app.post('/delete-todo', (req, res) => {
    const { title_id } = req.body;

    if (!title_id) {
        return res.status(400).json({ success: false, message: "Title ID is required" });
    }

    const deleteListsQuery = "DELETE FROM lists WHERE title_id = $1";
    db.query(deleteListsQuery, [title_id])
      .then(() => {
        const deleteTitleQuery = "DELETE FROM titles WHERE id = $1";
        return db.query(deleteTitleQuery, [title_id]);
      })
      .then(() => {
        res.status(200).json({ success: true, message: "To-Do Successfully Deleted" });
      })
      .catch(error => {
        console.error("Error deleting to-do:", error);
        res.status(500).json({ success: false, message: "Error deleting To-Do List" });
      });
});
 app.post('/delete-list', async (req, res) => {
    const { list_id } = req.body;

    if (!list_id) {
        return res.status(400).json({ success: false, message: "List ID is required" });
    }

    try {
        const deleteListQuery = "DELETE FROM lists WHERE id = $1";
        await db.query(deleteListQuery, [list_id]);

        res.status(200).json({ success: true, message: "List item deleted successfully" });
    } catch (error) {
        console.error("Error deleting list item:", error);
        res.status(500).json({ success: false, message: "Error deleting list item" });
    }
});




app.post("/update-list", async (req, res) => {
    const { list_id, list_desc } = req.body;

    if (!list_id || !list_desc.trim()) {
        return res.status(400).json({ error: "List ID and new description are required" });
    }

    try {
        await db.query("UPDATE lists SET list_desc = $1 WHERE id = $2", [list_desc, list_id]);
        res.json({ message: "List item updated successfully" });
    } catch (error) {
        console.error("Error updating list item:", error);
        res.status(500).json({ error: "Failed to update list item" });
    }
});

app.post("/update-title", async (req, res) => {
    const { title_id, title } = req.body;

    if (!title_id || !title.trim()) {
        return res.status(400).json({ error: "Title ID and new title are required" });
    }

    try {
        const dateModified = new Date().toISOString().split('T')[0]; // Get the current timestamp
        await db.query(
            "UPDATE titles SET title = $1, date_modified = $2 WHERE id = $3",
            [title, dateModified, title_id]
        );
        res.json({ message: "Title updated successfully" });
    } catch (error) {
        console.error("Error updating title:", error);
        res.status(500).json({ error: "Failed to update title" });
    }
});

app.post("/add-list", async (req, res) => {
    const { title_id, list_desc } = req.body;

    if (!title_id || !list_desc.trim()) {
        return res.status(400).json({ error: "Title ID and list description are required" });
    }

    try {
        const query = "INSERT INTO lists (title_id, list_desc, status) VALUES ($1, $2, false) RETURNING *";
        const result = await db.query(query, [title_id, list_desc]);

        res.json({ success: true, list: result.rows[0] });
    } catch (error) {
        console.error("Error adding list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});






app.post('/update-status', (req, res) => {
    const { title_id, list_id, status } = req.body;

    const updateListQuery = "UPDATE lists SET status = $1 WHERE id = $2";
    db.query(updateListQuery, [status, list_id])
        .then(() => {
            const updateTitleQuery = "UPDATE titles SET status = $1 WHERE id = $2";
            return db.query(updateTitleQuery, [status, title_id]);
        })
        .then(() => {
            res.status(200).json({ success: true, message: "List status successfully updated" });
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ success: false, message: "Error updating list status" });
        });
});



/* app.post('/delete-todo', (req, res) => {
    const { title_id } = req.body;

    const deleteListsQuery = "DELETE FROM lists WHERE title_id = $1";
    db.query(deleteListsQuery, [title_id])
      .then(() => {
        const deleteTitleQuery = "DELETE FROM titles WHERE id = $1";
        return db.query(deleteTitleQuery, [title_id]);
      })
      .then(() => {
        res.status(200).json({ success: true, message: "To-do Successfully Deleted" });
      })
      .catch(error => {
        console.error(error);
        res.status(500).json({ success: false, message: "Error deleting To-Do List" });
      });
});


app.post('/update-todo', (req, res) => {
    const { title_id, list } = req.body;
    const date_modified = new Date().toISOString().split('T')[0];

    const deleteListsQuery = "DELETE FROM lists WHERE title_id = $1";
    db.query(deleteListsQuery, [title_id])
        .then(() => {
            const insertQueries = list.map(task => {
                const insertQuery = "INSERT INTO lists (title_id, list_desc, status) VALUES ($1, $2, true)";
                return db.query(insertQuery, [title_id, task]);
            });
            return Promise.all(insertQueries);
        })
        .then(() => {
            const updateTitleQuery = "UPDATE titles SET date_modified = $1 WHERE id = $2";
            return db.query(updateTitleQuery, [date_modified, title_id]);
        })
        
        .then(() => {
            res.status(200).json({ success: true, message: "To-do successfully updated" });
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ success: false, message: "Error updating To-Do List" });
        });
}); */











/*  //add-to-do
app.post('/add-title', (req, res) => {
    const { id, username, title, date_modified, status } = req.body;

    const query = "INSERT INTO titles (id, username, title, date_modified, status) VALUES ($1,$2,$3,$4,$5)";
    db.query(query, [id, username, title, date_modified, status])
        .then(result => {
            res.status(200).json({success: true});

        });
    //object Destructurinf 
    const { fname, lname } = req.body;
    res.send(`Hello ${fname} ${lname}`); 
});

app.post('/add-lists', (req, res) => {
    const { id, title_id, list_desc, status } = req.body;

    const query = "INSERT INTO lists (id, title_id, list_desc, status) VALUES ($1,$2,$3,$4)";
    db.query(query, [id, title_id, list_desc, status])
        .then(result => {
            res.status(200).json({success: true});

        });
});  */


/* //update-to-do
app.get('/update-to-do', (req, res) => {
    res.send('This is update-to-do homepage');
});

//delete-to-do
app.get('/delete-to-do', (req, res) => {
    res.send('This is delete-to-do homepage');
}); */

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);

}); 