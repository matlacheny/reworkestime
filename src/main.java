

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint ("/server/{username}")
public class main {
		
	public main() {
		
		String path = getLogsPath();
		
        // Create directory
        File file = new File(path);
        if (!file.exists()) {
            if (file.mkdirs()) {  // Use mkdirs() to ensure parent directories are created
                System.out.println("Directory created successfully: " + path);
            } else {
                System.out.println("Failed to create directory: " + path);
            }
        } else {
            System.out.println("Directory already exists: " + path);
        }
	}
	
	private String createJSON(String type, String data) {
		JsonObject jsonObj = Json.createObjectBuilder()
			.add("key", type)
			.add("data", data)
			.build();

		return jsonObj.toString();
	}
	
	private void handleException(Exception e) {
		if (e.getMessage() != null && e.getMessage().contains("pipe")) {
			System.out.println("The session has already been closed...");
		} else {
			e.printStackTrace();
			e.getCause();
		}
	}
	
	private Session getSession(Session session, String value) {
		for (Session s : session.getOpenSessions()) {
			String v = s.getUserProperties().get("name").toString();
			if (v.equals(value)) {
				return s;
			}
		}
		return null;
	}
	
	// -------------------------------------------------------------------
	// History related methods
	
	private void recoverHistoryLog(String client, Session session) {
		String filePath = getHistoryFilePath(client);
		File file = new File(filePath);
		try {
			if(file.createNewFile()){
	            System.out.println("File " + filePath + " created.");
	            try (FileWriter fileWriter = new FileWriter(filePath)) {
					 
	            	fileWriter.write("");
	            	fileWriter.close();
		 
		        } catch (IOException e) {
			        	handleException(e);
		        }
	        }else {
	        	System.out.println("File " + filePath + " already exists.");
	        	List<String> fileContent = getHistoryFileContent(filePath);
	    		
	    		int	nbItems = fileContent.size(),
	    			count = 1;
	    		
	    		for (String item : fileContent) {
	    			JsonObject data = Json.createObjectBuilder()
		    				.add("total", nbItems)
		    				.add("index", count)
		    				.add("element", item)
		    				.build();
	    			
	    			if (session.isOpen()) sendMessage(createJSON("history", data.toString()), session);
	    			count ++;
	    		}
	        }
		}catch(IOException e) {
				handleException(e);
		}
	}
	
	private String getLogsPath() {
		String path = "";

        // Use CATALINA_BASE if available, otherwise fallback to CATALINA_HOME
        String tomcatBase = System.getenv("CATALINA_BASE");
        if (tomcatBase == null || tomcatBase.isEmpty()) {
            tomcatBase = System.getenv("CATALINA_HOME");  // Fallback
        }

        // If Tomcat is not set, create the folder inside the project directory
        if (tomcatBase == null || tomcatBase.isEmpty()) {
            File projectDir = new File(System.getProperty("user.dir"));  // Get the project root
            path = projectDir.getAbsolutePath() + "/estime-logs/";
            System.out.println("CATALINA_BASE and CATALINA_HOME are not set, using project directory.");
        } else {
            path = tomcatBase + "/webapps/estime-logs/";
        }

        System.out.println("Log Directory Path: " + path);
        
        return path;
	}
	
	private String getHistoryFilePath(String client) {

		String fileName = "history-" + client + ".txt";		
		
		return getLogsPath() + fileName;

	}
	
	private List<String> getHistoryFileContent(String filePath) {
		try {
			return Files.readAllLines(Paths.get(filePath));
		} catch (IOException e) {
			handleException(e);
		}
		return null;
	}
	
	private void updateHistoryFile(String client, String value, String action, String index) throws IOException {
		String filePath = getHistoryFilePath(client);
		List<String> fileContent = getHistoryFileContent(filePath);
		
		FileWriter fileWriter = new FileWriter(filePath, action.equals("append"));
		PrintWriter printWriter = new PrintWriter(fileWriter);
		switch(action) {
		case "append":
		    printWriter.println(value);  //New line
		    break;
		case "remove-item":
			for (Iterator<String> iter = fileContent.listIterator(); iter.hasNext(); ) {
				String item = iter.next();
				JsonReader jsonReader = Json.createReader(new StringReader(item));
				JsonObject obj = jsonReader.readObject();
				jsonReader.close();
				if (!obj.get("index").toString().equals(index)) {
					printWriter.println(item); 
				}
			}
			break;
		default:
			fileWriter.write(value);
		}
		printWriter.close();
		fileWriter.close();
	}
	
	/// -----------------------------------------------------------
	private void checkUsername(Session session, String name) {
		if (getSession(session, name) != null) {
			sendMessage(createJSON("username-taken", ""), session);
		} 
	}
	
	@OnOpen
	public void onOpen(Session session, @PathParam("username") String username) {
		
		session.setMaxIdleTimeout(-1l); 
		session.setMaxTextMessageBufferSize(1000000);
		
		String[] split = username.split("-");
		
		String role = split[0];
		String name = split[1];
		String action = split[2];
		
		System.out.println(role + " " + name + ": open connection...");
		
		if (action.equals("init"))
			checkUsername(session, name);	
		
		session.getUserProperties().put("role", role);
		session.getUserProperties().put("name", name);
		session.getUserProperties().put("parent", "");
					
		if (split.length > 3) 
			session.getUserProperties().put("parent", split[3]);	
		
		if (role.equals("controller")) recoverHistoryLog(name, session);
		updateClients(session, "open");
		
		System.gc();
	}
	
	@OnClose
	public void onClose(Session session, CloseReason closeReason) throws IOException {
		
		System.out.println("Closed " + session.getId() + " due to " + closeReason.getCloseCode());

		updateClients(session, "close");
		
		session.close();
	}
	
	private void sendMessage(String message, Session session) {
		if (session.isOpen()) {
			try {
				synchronized (session) {
					session.getBasicRemote().sendText(message);
				}
			}catch(IOException e) {
				handleException(e);
			}
		}
	}
	
	//It broadcast a message to the controllers the changes on their connected dashboards
	
	private void updateClients(Session session, String action) {
		
		ArrayList<JsonObject> clients = new ArrayList<JsonObject>();
		JsonObject data = null;
		Map<String, Object> properties = session.getUserProperties();
		
		// add the current session information to the array
		data = Json.createObjectBuilder()
				.add("username", properties.get("name").toString())
				.add("role", properties.get("role").toString())
				.add("parent", properties.get("parent").toString())
				.build();
		clients.add(data);
		
		// add the information on other open sessions
		for (Session s : session.getOpenSessions()) {
			if (s.isOpen()) {
				properties = s.getUserProperties();
				data = Json.createObjectBuilder()
						.add("username", properties.get("name").toString())
						.add("role", properties.get("role").toString())
						.add("parent", properties.get("parent").toString())
						.build();
				clients.add(data);
			}
		}
		
		data = Json.createObjectBuilder()
				.add("action", action)
				.add("client", session.getUserProperties().get("name").toString())
				.add("clients", clients.toString())
				.build();
		
		sendMessage(createJSON("update-clients", data.toString()), session);
		for (Session s : session.getOpenSessions()) {
			sendMessage(createJSON("update-clients", data.toString()), s);
		}
	}
	
	
	@OnMessage
	public void onMessage(String message, Session session) 
			throws IOException {
		
		Session newSession = null;
		
		JsonReader jsonReader = Json.createReader(new StringReader(message));
		JsonObject object = jsonReader.readObject();
		jsonReader.close();
	
		jsonReader = Json.createReader(new StringReader(object.get("data").toString()));
		JsonObject data = jsonReader.readObject();
		jsonReader.close();
		
		Map<String, Object> properties = session.getUserProperties();
		
		String key = object.get("key").toString();
		switch(key) {
		case "update-username":
			checkUsername(session, data.get("username").toString());
			properties.put("name", data.get("username").toString());
			
			if (properties.get("role").equals("controller")) recoverHistoryLog(data.get("username").toString(), session);
			updateClients(session, "update-username");
			break;
		case "set-parent":
			newSession = getSession(session, data.get("dashboard").toString());
			
			if (newSession != null) {
				newSession.getUserProperties().put("parent", properties.get("name").toString());
				sendMessage(createJSON("set-parent", data.toString()), newSession);	
				updateClients(session, "parent");
			}
			break;
		case "unset-parent":
			newSession = getSession(session, data.get("dashboard").toString());
			
			if (newSession != null) {
				newSession.getUserProperties().put("parent", "");
				sendMessage(createJSON("unset-parent", data.toString()), newSession);
				updateClients(session, "parent");
			}
			break;
		case "elements":	
			newSession = getSession(session, data.get("parent").toString());
			if (newSession != null) {
				sendMessage(createJSON(key, data.toString()), newSession);
			}
			break;
		case "clear-history":
			updateHistoryFile(data.get("client").toString(), "", "clear", null);
			break;
		case "save-history":
			updateHistoryFile(data.get("client").toString(), data.get("data").toString(), "append", null);
			break;
		case "remove-history-item":
			updateHistoryFile(data.get("client").toString(), null, "remove-item",  data.get("itemID").toString());
			break;
		default:
			broadcastMessage(createJSON(key, object.get("data").toString()), session); 
		}
		System.gc();
	}
	
	private void broadcastMessage(String message, Session session) {		
		sendMessage(message, session);
		
		for (Session s : session.getOpenSessions()) {
			if (s.getUserProperties().get("parent").toString().equals(session.getUserProperties().get("name").toString())) {
				sendMessage(message, s);
			}
		}
	}
	
	@OnError
	public void onError(Throwable e) {
		if (e.getMessage() != null && e.getMessage().contains("pipe")) {
			System.out.println("The session has already been closed...");
		} else {
			e.printStackTrace();
			e.getCause();
		}
	}	
}
