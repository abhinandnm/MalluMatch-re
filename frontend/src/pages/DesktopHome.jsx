            <div className="mode-selection">
              <label>SELECT MODE</label>

              <div
                className={`mode-btn ${selectedMode === 'text' ? 'selected' : ''}`}
                onClick={() => setSelectedMode('text')}
              >
                <div className="mode-icon-wrapper">
                  <MessageSquare size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Text Chat</span>
                  <span className="mode-sub">Lightning-fast anonymous messaging</span>
                </div>
                <div className="mode-badge popular">POPULAR</div>
              </div>

              <div
                className={`mode-btn ${selectedMode === 'video' ? 'selected' : ''}`}
                onClick={() => {
                  alert("Video chats are disabled temporarily. Please use text chat.");
                  setSelectedMode('text');
                }}
              >
                <div className="mode-icon-wrapper">
                  <Video size={20} />
                </div>
                <div className="mode-content">
                  <span className="mode-title">Video Chat</span>
                  <span className="mode-sub">Face to face real-time connection</span>
                </div>
                <div className="mode-badge live">LIVE</div>
              </div>
            </div>
