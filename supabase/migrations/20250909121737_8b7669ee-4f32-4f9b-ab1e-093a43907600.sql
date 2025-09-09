-- Fix missing foreign key relationships for tagging system
-- Add foreign key constraint from content_tags to tags table
ALTER TABLE content_tags 
ADD CONSTRAINT content_tags_tag_id_fkey 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- Add foreign key constraint from content_tags to content table  
ALTER TABLE content_tags 
ADD CONSTRAINT content_tags_content_id_fkey 
FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;